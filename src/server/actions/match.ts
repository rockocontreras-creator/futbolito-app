"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { formatMatchDate } from "@/lib/format";
import { goingWindowOpen } from "@/lib/match-timing";
import { weeklySlot } from "@/lib/series";
import {
  answerGoingSchema,
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
        participants: { create: { userId: user.id, status: "REGISTERED" } },
      },
    });
    return { id: match.id };
  });
}

/** Sumarse a un revoltijo: inscrito si hay cupo, si no a la lista de espera. */
export async function joinMatch(input: unknown) {
  return runAction(matchIdSchema, input, async ({ matchId }) => {
    const { user, profile } = await requireProfile();

    const result = await db.$transaction(async (tx) => {
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
        where: { matchId_userId: { matchId, userId: user.id } },
      });
      if (existing?.status === "KICKED") throw new AuthError("El organizador te sacó de este partido.");
      if (existing && existing.status !== "WITHDRAWN") throw new AuthError("Ya estás en este partido.");

      const capacity = match.maxPlayers ?? match.playersPerSide * 2;
      const registered = await tx.matchParticipant.count({ where: { matchId, status: "REGISTERED" } });
      const status = statusForNewPlayer(registered, capacity);

      if (existing) {
        await tx.matchParticipant.update({
          where: { id: existing.id },
          data: { status, joinedAt: new Date(), side: null },
        });
      } else {
        await tx.matchParticipant.create({ data: { matchId, userId: user.id, status } });
      }
      const nowRegistered = registered + (status === "REGISTERED" ? 1 : 0);
      await tx.match.update({
        where: { id: matchId },
        data: { status: matchStatusFor(nowRegistered, capacity) },
      });
      return { status, nowRegistered, capacity, organizerId: match.organizerId, startsAt: match.startsAt };
    });

    if (result.status === "REGISTERED") {
      const href = `/partidos/${matchId}`;
      const when = formatMatchDate(result.startsAt);
      const missing = result.capacity - result.nowRegistered;
      if (result.organizerId !== user.id) {
        await notifyUsers([result.organizerId], {
          type: "PICKUP_JOINED",
          key: `joined:${matchId}`,
          title: `${profile.displayName} se sumó a tu revoltijo`,
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
          players.map((p) => p.userId).filter((id) => id !== user.id),
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
