"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { formatMatchDate } from "@/lib/format";
import { goingWindowOpen } from "@/lib/match-timing";
import { weeklySlot } from "@/lib/series";
import {
  answerGoingSchema,
  answerJoinRequestSchema,
  createPickupSchema,
  matchIdSchema,
  NEW_VENUE,
  seriesIdSchema,
} from "@/lib/validations/match";
import { runAction } from "@/server/action-result";
import { AuthError, requireUser } from "@/server/permissions";
import { notifyUsers } from "@/server/services/notify";
import {
  joinBlocker,
  matchStatusFor,
  promoteFromWaitlist,
  statusForNewPlayer,
} from "@/server/services/pickup-roster";

async function requireProfile() {
  const user = await requireUser();
  const profile = await db.playerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) throw new AuthError("Primero crea tu perfil de jugador.");
  return { user, profile };
}

/** Publica un revoltijo. El organizador queda inscrito automáticamente. */
export async function createPickup(input: unknown) {
  return runAction(createPickupSchema, input, async (data) => {
    const { user, profile } = await requireProfile();

    let venueId: string;
    if (data.venueId === NEW_VENUE) {
      // Cancha nueva: queda pendiente de aprobación del admin, pero se puede usar de inmediato.
      const venue = await db.venue.create({
        data: {
          name: data.newVenueName!,
          surface: data.newVenueSurface ?? "SYNTHETIC",
          latitude: data.newVenueLat ?? null,
          longitude: data.newVenueLng ?? null,
          comunaId: profile.comunaId,
          proposedById: user.id,
        },
      });
      venueId = venue.id;
    } else {
      const venue = await db.venue.findFirst({
        where: {
          id: data.venueId,
          comunaId: profile.comunaId,
          OR: [{ status: "APPROVED" }, { status: "PENDING", proposedById: user.id }],
        },
      });
      if (!venue) throw new AuthError("Esa cancha no está disponible. Elige otra.");
      venueId = venue.id;
    }

    // Pichanga fija: se guarda la "receta" para publicar sola la fecha de cada semana.
    const series = data.weekly
      ? await db.matchSeries.create({
          data: {
            organizerId: user.id,
            comunaId: profile.comunaId,
            venueId,
            ...weeklySlot(data.startsAtLocal),
            durationMinutes: data.durationMinutes,
            playersPerSide: data.playersPerSide,
            maxPlayers: data.maxPlayers,
            minRating: data.minRating,
            maxRating: data.maxRating,
            pricePerPerson: data.pricePerPerson,
            notes: data.notes || null,
            colorA: data.colorA,
            colorB: data.colorB,
            isPrivate: data.isPrivate,
          },
        })
      : null;

    const match = await db.match.create({
      data: {
        type: "PICKUP",
        seriesId: series?.id,
        comunaId: profile.comunaId,
        venueId,
        organizerId: user.id,
        startsAt: data.startsAtLocal,
        durationMinutes: data.durationMinutes,
        playersPerSide: data.playersPerSide,
        maxPlayers: data.maxPlayers,
        minRating: data.minRating,
        maxRating: data.maxRating,
        pricePerPerson: data.pricePerPerson,
        notes: data.notes || null,
        colorA: data.colorA,
        colorB: data.colorB,
        isPrivate: data.isPrivate,
        participants: { create: { userId: user.id, status: "REGISTERED" } },
      },
    });
    return { id: match.id };
  });
}

type Profile = { rating: number; displayName: string };

/**
 * Mete a un jugador al revoltijo: inscrito si hay cupo, si no a la lista de espera.
 * `viaRequest` es cuando el organizador acepta una solicitud (se salta el candado del partido privado).
 */
async function enterMatch(matchId: string, userId: string, profile: Profile, viaRequest = false) {
  return db.$transaction(async (tx) => {
    // Bloquea la fila del partido para que dos personas no tomen el último cupo a la vez.
    await tx.$queryRaw`SELECT id FROM "Match" WHERE id = ${matchId} FOR UPDATE`;
    const match = await tx.match.findFirst({ where: { id: matchId, deletedAt: null, type: "PICKUP" } });
    if (!match) throw new AuthError("Ese partido no existe.");

    const blocker = joinBlocker({
      rating: profile.rating,
      minRating: match.minRating,
      maxRating: match.maxRating,
      startsAt: match.startsAt,
      now: new Date(),
      status: match.status,
    });
    if (blocker) throw new AuthError(blocker);

    const existing = await tx.matchParticipant.findUnique({
      where: { matchId_userId: { matchId, userId } },
    });
    if (existing?.status === "KICKED") throw new AuthError("El organizador te sacó de este partido.");
    if (existing && existing.status !== "WITHDRAWN") throw new AuthError("Ya estás en este partido.");

    if (match.isPrivate && !viaRequest && match.organizerId !== userId) {
      // Quien ya fue aceptado y se bajó puede volver sin pedirlo de nuevo.
      const accepted = await tx.joinRequest.findFirst({ where: { matchId, userId, status: "ACCEPTED" } });
      if (!accepted) throw new AuthError("Este partido es privado: pide entrar y espera a que te acepten.");
    }

    const capacity = match.maxPlayers ?? match.playersPerSide * 2;
    const registered = await tx.matchParticipant.count({ where: { matchId, status: "REGISTERED" } });
    const status = statusForNewPlayer(registered, capacity);

    if (existing) {
      await tx.matchParticipant.update({
        where: { id: existing.id },
        data: { status, joinedAt: new Date(), side: null },
      });
    } else {
      await tx.matchParticipant.create({ data: { matchId, userId, status } });
    }
    const nowRegistered = registered + (status === "REGISTERED" ? 1 : 0);
    await tx.match.update({
      where: { id: matchId },
      data: { status: matchStatusFor(nowRegistered, capacity) },
    });
    return { status, nowRegistered, capacity, organizerId: match.organizerId, startsAt: match.startsAt };
  });
}

/** Avisos cuando alguien queda inscrito: al organizador, "falta 1" y "revoltijo lleno". */
async function announceJoin(
  matchId: string,
  userId: string,
  displayName: string,
  result: Awaited<ReturnType<typeof enterMatch>>,
  tellOrganizer = true,
) {
  if (result.status !== "REGISTERED") return;
  const href = `/partidos/${matchId}`;
  const when = formatMatchDate(result.startsAt);
  const missing = result.capacity - result.nowRegistered;
  if (tellOrganizer && result.organizerId !== userId) {
    await notifyUsers([result.organizerId], {
      type: "PICKUP_JOINED",
      key: `joined:${matchId}`,
      title: `${displayName} se sumó a tu revoltijo`,
      body: `Van ${result.nowRegistered} de ${result.capacity} para el ${when}.`,
      href,
    });
  }
  if (missing === 1 || missing === 0) {
    const players = await db.matchParticipant.findMany({
      where: { matchId, status: "REGISTERED" },
      select: { userId: true },
    });
    await notifyUsers(
      players.map((p) => p.userId).filter((id) => id !== userId),
      missing === 1
        ? {
            type: "PICKUP_JOINED",
            key: `one-left:${matchId}`,
            renotify: false,
            title: "Falta 1 para tu revoltijo",
            body: `El del ${when}. Si conoces a alguien, pásale el link.`,
            href,
          }
        : {
            type: "PICKUP_FULL",
            key: `full:${matchId}`,
            renotify: false,
            title: "Revoltijo lleno",
            body: `Están todos para el ${when}.`,
            href,
          },
    );
  }
}

/** Sumarse a un revoltijo: inscrito si hay cupo, si no a la lista de espera. */
export async function joinMatch(input: unknown) {
  return runAction(matchIdSchema, input, async ({ matchId }) => {
    const { user, profile } = await requireProfile();
    const result = await enterMatch(matchId, user.id, profile);
    await announceJoin(matchId, user.id, profile.displayName, result);
    refresh();
    return { status: result.status };
  });
}

/** Partido privado: pedir entrar. El organizador acepta o rechaza. */
export async function requestJoin(input: unknown) {
  return runAction(matchIdSchema, input, async ({ matchId }) => {
    const { user, profile } = await requireProfile();
    const match = await db.match.findFirst({ where: { id: matchId, deletedAt: null, type: "PICKUP" } });
    if (!match) throw new AuthError("Ese partido no existe.");
    if (!match.isPrivate) throw new AuthError("Este partido es público: puedes sumarte directo.");
    if (match.organizerId === user.id) throw new AuthError("Organizas este partido.");
    const blocker = joinBlocker({
      rating: profile.rating,
      minRating: match.minRating,
      maxRating: match.maxRating,
      startsAt: match.startsAt,
      now: new Date(),
      status: match.status,
    });
    if (blocker) throw new AuthError(blocker);

    const [participant, request] = await Promise.all([
      db.matchParticipant.findUnique({ where: { matchId_userId: { matchId, userId: user.id } } }),
      db.joinRequest.findUnique({ where: { matchId_userId: { matchId, userId: user.id } } }),
    ]);
    if (participant?.status === "KICKED") throw new AuthError("El organizador te sacó de este partido.");
    if (participant && participant.status !== "WITHDRAWN") throw new AuthError("Ya estás en este partido.");
    if (request?.status === "PENDING") throw new AuthError("Ya pediste entrar. Falta que te respondan.");
    if (request?.status === "REJECTED") throw new AuthError("El organizador no aceptó tu solicitud.");
    if (request?.status === "ACCEPTED") throw new AuthError("Ya te aceptaron: súmate al partido.");

    await db.joinRequest.create({ data: { matchId, userId: user.id } });
    await notifyUsers([match.organizerId], {
      type: "PICKUP_JOINED",
      key: `join-request:${matchId}`,
      title: `${profile.displayName} quiere entrar a tu partido`,
      body: `Es privado: acepta o rechaza la solicitud para el ${formatMatchDate(match.startsAt)}.`,
      href: `/partidos/${matchId}`,
    });
    refresh();
    return { requested: true };
  });
}

/** Retirar la solicitud que todavía no responden. */
export async function cancelJoinRequest(input: unknown) {
  return runAction(matchIdSchema, input, async ({ matchId }) => {
    const user = await requireUser();
    await db.joinRequest.deleteMany({ where: { matchId, userId: user.id, status: "PENDING" } });
    refresh();
    return null;
  });
}

/** El organizador (o un admin) acepta o rechaza una solicitud. Al aceptar, el jugador queda dentro. */
export async function answerJoinRequest(input: unknown) {
  return runAction(answerJoinRequestSchema, input, async ({ requestId, accept }) => {
    const user = await requireUser();
    const request = await db.joinRequest.findUnique({
      where: { id: requestId },
      include: {
        match: { select: { id: true, organizerId: true, startsAt: true } },
        user: { select: { profile: { select: { rating: true, displayName: true } } } },
      },
    });
    if (!request) throw new AuthError("Esa solicitud ya no existe.");
    if (request.match.organizerId !== user.id && user.role !== "ADMIN") {
      throw new AuthError("Solo quien organiza puede responder las solicitudes.");
    }
    if (request.status !== "PENDING") throw new AuthError("Esa solicitud ya fue respondida.");
    const matchId = request.match.id;
    const href = `/partidos/${matchId}`;
    const when = formatMatchDate(request.match.startsAt);

    if (!accept) {
      await db.joinRequest.update({ where: { id: requestId }, data: { status: "REJECTED" } });
      await notifyUsers([request.userId], {
        type: "SYSTEM",
        key: `join-answer:${matchId}`,
        title: "No aceptaron tu solicitud",
        body: `Para el partido del ${when}. Busca otro en la lista de partidos.`,
        href: "/partidos",
      });
      refresh();
      return { status: "REJECTED" as const };
    }

    const profile = request.user.profile;
    if (!profile) throw new AuthError("Esa persona ya no tiene perfil de jugador.");
    const result = await enterMatch(matchId, request.userId, profile, true);
    await db.joinRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED" } });
    await notifyUsers([request.userId], {
      type: "PICKUP_JOINED",
      key: `join-answer:${matchId}`,
      title:
        result.status === "WAITLIST"
          ? "Te aceptaron: quedaste en la lista de espera"
          : "Te aceptaron: estás dentro",
      body: `Partido del ${when}.`,
      href,
    });
    await announceJoin(matchId, request.userId, profile.displayName, result, false);
    refresh();
    return { status: result.status };
  });
}

/** Avisa al que subió desde la lista de espera. */
async function notifyPromoted(matchId: string, userId: string | null) {
  if (!userId) return;
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { startsAt: true, venue: { select: { name: true } } },
  });
  if (!match) return;
  await notifyUsers([userId], {
    type: "PICKUP_JOINED",
    key: `promoted:${matchId}`,
    title: "Se liberó un cupo: estás dentro",
    body: `${formatMatchDate(match.startsAt)}${match.venue ? ` en ${match.venue.name}` : ""}. Subiste desde la lista de espera.`,
    href: `/partidos/${matchId}`,
  });
}

/** Saca a un jugador del partido y sube al primero de la lista de espera. Devuelve a quién subió. */
async function withdrawFromMatch(matchId: string, userId: string): Promise<string | null> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Match" WHERE id = ${matchId} FOR UPDATE`;
    const match = await tx.match.findFirst({ where: { id: matchId, deletedAt: null } });
    if (!match) throw new AuthError("Ese partido no existe.");
    if (match.organizerId === userId)
      throw new AuthError("Eres el organizador: no puedes bajarte de tu propio partido.");
    if (!["OPEN", "FULL"].includes(match.status) || match.startsAt <= new Date()) {
      throw new AuthError("Ya no puedes bajarte de este partido.");
    }

    const me = await tx.matchParticipant.findUnique({
      where: { matchId_userId: { matchId, userId } },
    });
    if (!me || (me.status !== "REGISTERED" && me.status !== "WAITLIST"))
      throw new AuthError("No estás en este partido.");

    await tx.matchParticipant.update({
      where: { id: me.id },
      data: { status: "WITHDRAWN", side: null, goingAt: null },
    });

    const waitlist = await tx.matchParticipant.findMany({
      where: { matchId, status: "WAITLIST" },
      select: { id: true, joinedAt: true, userId: true },
    });
    const promotedId = promoteFromWaitlist(me.status, waitlist);
    if (promotedId)
      await tx.matchParticipant.update({ where: { id: promotedId }, data: { status: "REGISTERED" } });

    const capacity = match.maxPlayers ?? match.playersPerSide * 2;
    const registered = await tx.matchParticipant.count({ where: { matchId, status: "REGISTERED" } });
    await tx.match.update({
      where: { id: matchId },
      data: { status: matchStatusFor(registered, capacity) },
    });
    return waitlist.find((w) => w.id === promotedId)?.userId ?? null;
  });
}

/** Bajarse de un revoltijo. Si había lista de espera, sube el primero y se le avisa. */
export async function leaveMatch(input: unknown) {
  return runAction(matchIdSchema, input, async ({ matchId }) => {
    const user = await requireUser();
    await notifyPromoted(matchId, await withdrawFromMatch(matchId, user.id));
    refresh();
    return { left: true };
  });
}

/**
 * "¿Vas o no vas?" del día del partido. "Voy" deja la confirmación a la vista de todos;
 * "No voy" lo baja del partido y sube al primero de la lista de espera.
 */
export async function answerGoing(input: unknown) {
  return runAction(answerGoingSchema, input, async ({ matchId, going }) => {
    const user = await requireUser();
    if (!going) {
      await notifyPromoted(matchId, await withdrawFromMatch(matchId, user.id));
      refresh();
      return { going: false };
    }
    const match = await db.match.findFirst({ where: { id: matchId, deletedAt: null, type: "PICKUP" } });
    if (!match) throw new AuthError("Ese partido no existe.");
    if (!goingWindowOpen(match.startsAt, match.status)) {
      throw new AuthError("Todavía no se puede confirmar: se abre 10 horas antes del partido.");
    }
    const updated = await db.matchParticipant.updateMany({
      where: { matchId, userId: user.id, status: "REGISTERED" },
      data: { goingAt: new Date() },
    });
    if (updated.count === 0) throw new AuthError("No estás inscrito en este partido.");
    refresh();
    return { going: true };
  });
}

/** Dejar de repetir una pichanga fija. Los partidos ya publicados siguen. */
export async function stopSeries(input: unknown) {
  return runAction(seriesIdSchema, input, async ({ seriesId }) => {
    const user = await requireUser();
    const series = await db.matchSeries.findUnique({ where: { id: seriesId } });
    if (!series) throw new AuthError("Esa pichanga fija ya no existe.");
    if (series.organizerId !== user.id && user.role !== "ADMIN") {
      throw new AuthError("Solo quien la organiza puede dejar de repetirla.");
    }
    await db.matchSeries.update({ where: { id: seriesId }, data: { isActive: false } });
    refresh();
    return null;
  });
}
