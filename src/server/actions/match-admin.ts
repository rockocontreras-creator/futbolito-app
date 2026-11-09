"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { balanceTeams } from "@/lib/rating/team-balance";
import {
  matchIdSchema,
  moveListSchema,
  participantActionSchema,
  setSideSchema,
} from "@/lib/validations/match";
import { runAction } from "@/server/action-result";
import { AuthError, requireUser } from "@/server/permissions";
import { matchStatusFor, promoteFromWaitlist } from "@/server/services/pickup-roster";
import type { Prisma } from "@/generated/prisma/client";

// Gestión del revoltijo por su organizador: expulsar, mover entre lados y listas, armar equipos parejos.
// Solo mientras el resultado no se haya reportado.

type Tx = Prisma.TransactionClient;

async function lockManagedMatch(tx: Tx, matchId: string, userId: string) {
  await tx.$queryRaw`SELECT id FROM "Match" WHERE id = ${matchId} FOR UPDATE`;
  const match = await tx.match.findFirst({ where: { id: matchId, deletedAt: null, type: "PICKUP" } });
  if (!match) throw new AuthError("Ese partido no existe.");
  const me = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (match.organizerId !== userId && me?.role !== "ADMIN") {
    throw new AuthError("Solo quien organiza el partido puede hacer esto.");
  }
  if (!["OPEN", "FULL", "CONFIRMED"].includes(match.status)) {
    throw new AuthError("El resultado ya se reportó: el plantel quedó cerrado.");
  }
  return match;
}

async function syncStatus(tx: Tx, match: { id: string; maxPlayers: number | null; playersPerSide: number }) {
  const capacity = match.maxPlayers ?? match.playersPerSide * 2;
  const registered = await tx.matchParticipant.count({ where: { matchId: match.id, status: "REGISTERED" } });
  await tx.match.update({ where: { id: match.id }, data: { status: matchStatusFor(registered, capacity) } });
}

async function participantOf(tx: Tx, matchId: string, userId: string) {
  const p = await tx.matchParticipant.findUnique({ where: { matchId_userId: { matchId, userId } } });
  if (!p || (p.status !== "REGISTERED" && p.status !== "WAITLIST")) {
    throw new AuthError("Ese jugador no está en el partido.");
  }
  return p;
}

/** Expulsar a un jugador. No puede volver a inscribirse. Si estaba inscrito, sube el primero de la espera. */
export async function kickParticipant(input: unknown) {
  return runAction(participantActionSchema, input, async ({ matchId, userId }) => {
    const user = await requireUser();
    if (userId === user.id) throw new AuthError("No puedes expulsarte a ti mismo.");
    await db.$transaction(async (tx) => {
      const match = await lockManagedMatch(tx, matchId, user.id);
      const p = await participantOf(tx, matchId, userId);
      await tx.matchParticipant.update({ where: { id: p.id }, data: { status: "KICKED", side: null } });
      const waitlist = await tx.matchParticipant.findMany({
        where: { matchId, status: "WAITLIST" },
        select: { id: true, joinedAt: true },
      });
      const promoted = promoteFromWaitlist(p.status as "REGISTERED" | "WAITLIST", waitlist);
      if (promoted)
        await tx.matchParticipant.update({ where: { id: promoted }, data: { status: "REGISTERED" } });
      await syncStatus(tx, match);
    });
    refresh();
    return { kicked: true };
  });
}

/** Mover a un jugador al equipo A, al B o dejarlo sin equipo. */
export async function setParticipantSide(input: unknown) {
  return runAction(setSideSchema, input, async ({ matchId, userId, side }) => {
    const user = await requireUser();
    await db.$transaction(async (tx) => {
      await lockManagedMatch(tx, matchId, user.id);
      const p = await participantOf(tx, matchId, userId);
      if (p.status !== "REGISTERED") throw new AuthError("Primero súbelo de la lista de espera.");
      await tx.matchParticipant.update({ where: { id: p.id }, data: { side } });
    });
    refresh();
    return { side };
  });
}

/** Subir a alguien de la lista de espera o bajarlo a ella. */
export async function moveParticipantList(input: unknown) {
  return runAction(moveListSchema, input, async ({ matchId, userId, list }) => {
    const user = await requireUser();
    await db.$transaction(async (tx) => {
      const match = await lockManagedMatch(tx, matchId, user.id);
      const p = await participantOf(tx, matchId, userId);
      if (p.status === list) return;
      if (list === "REGISTERED") {
        const capacity = match.maxPlayers ?? match.playersPerSide * 2;
        const registered = await tx.matchParticipant.count({ where: { matchId, status: "REGISTERED" } });
        if (registered >= capacity) {
          throw new AuthError("No quedan cupos. Baja a alguien a la espera o expulsa a alguien primero.");
        }
      } else if (userId === match.organizerId) {
        throw new AuthError("El organizador no puede quedar en la lista de espera.");
      }
      await tx.matchParticipant.update({
        where: { id: p.id },
        data: { status: list, side: null },
      });
      await syncStatus(tx, match);
    });
    refresh();
    return { list };
  });
}

/** "Armar equipos": reparte a los inscritos en dos equipos parejos por rango, arqueros primero. */
export async function drawTeams(input: unknown) {
  return runAction(matchIdSchema, input, async ({ matchId }) => {
    const user = await requireUser();
    const result = await db.$transaction(async (tx) => {
      await lockManagedMatch(tx, matchId, user.id);
      const players = await tx.matchParticipant.findMany({
        where: { matchId, status: "REGISTERED" },
        include: { user: { select: { profile: { select: { rating: true, primaryPosition: true } } } } },
      });
      if (players.length < 2) throw new AuthError("Se necesitan al menos 2 inscritos para armar equipos.");
      const draft = balanceTeams(
        players.map((p) => ({
          id: p.id,
          rating: p.user.profile?.rating ?? 1000,
          isGoalkeeper: p.user.profile?.primaryPosition === "GOALKEEPER",
        })),
      );
      await tx.matchParticipant.updateMany({
        where: { id: { in: draft.sideA.map((p) => p.id) } },
        data: { side: "A" },
      });
      await tx.matchParticipant.updateMany({
        where: { id: { in: draft.sideB.map((p) => p.id) } },
        data: { side: "B" },
      });
      await tx.match.update({ where: { id: matchId }, data: { teamsDrawnAt: new Date() } });
      return { avgA: draft.avgA, avgB: draft.avgB };
    });
    refresh();
    return result;
  });
}

/** Deshacer los equipos (todos vuelven a "sin equipo"). */
export async function clearTeams(input: unknown) {
  return runAction(matchIdSchema, input, async ({ matchId }) => {
    const user = await requireUser();
    await db.$transaction(async (tx) => {
      await lockManagedMatch(tx, matchId, user.id);
      await tx.matchParticipant.updateMany({ where: { matchId }, data: { side: null } });
      await tx.match.update({ where: { id: matchId }, data: { teamsDrawnAt: null } });
    });
    refresh();
    return { cleared: true };
  });
}
