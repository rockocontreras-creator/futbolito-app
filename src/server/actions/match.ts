"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { createPickupSchema, matchIdSchema, NEW_VENUE } from "@/lib/validations/match";
import { runAction } from "@/server/action-result";
import { AuthError, requireUser } from "@/server/permissions";
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

    const match = await db.match.create({
      data: {
        type: "PICKUP",
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
      return { status };
    });
    refresh();
    return result;
  });
}

/** Bajarse de un revoltijo. Si había lista de espera, sube el primero. */
export async function leaveMatch(input: unknown) {
  return runAction(matchIdSchema, input, async ({ matchId }) => {
    const user = await requireUser();

    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Match" WHERE id = ${matchId} FOR UPDATE`;
      const match = await tx.match.findFirst({ where: { id: matchId, deletedAt: null } });
      if (!match) throw new AuthError("Ese partido no existe.");
      if (match.organizerId === user.id)
        throw new AuthError("Eres el organizador: no puedes bajarte de tu propio partido.");
      if (!["OPEN", "FULL"].includes(match.status) || match.startsAt <= new Date()) {
        throw new AuthError("Ya no puedes bajarte de este partido.");
      }

      const me = await tx.matchParticipant.findUnique({
        where: { matchId_userId: { matchId, userId: user.id } },
      });
      if (!me || (me.status !== "REGISTERED" && me.status !== "WAITLIST"))
        throw new AuthError("No estás en este partido.");

      await tx.matchParticipant.update({ where: { id: me.id }, data: { status: "WITHDRAWN", side: null } });

      const waitlist = await tx.matchParticipant.findMany({
        where: { matchId, status: "WAITLIST" },
        select: { id: true, joinedAt: true },
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
      return { left: true };
    });
    refresh();
    return result;
  });
}
