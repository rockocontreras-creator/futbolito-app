"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { matchIdSchema, peerReviewSchema, reportResultSchema } from "@/lib/validations/match";
import { runAction } from "@/server/action-result";
import { AuthError, requireUser } from "@/server/permissions";
import { goalsProblem, isDisputed, resultDueAt, sidesProblem } from "@/server/services/match-result";

const REVIEW_WINDOW_DAYS = 7;

/**
 * El organizador reporta el resultado del revoltijo: marcador, goleadores, MVP y quién no llegó.
 * Queda en PLAYED y se confirma solo en 24 h si la mayoría no lo objeta. Se puede corregir mientras tanto.
 */
export async function reportResult(input: unknown) {
  return runAction(reportResultSchema, input, async (data) => {
    const user = await requireUser();
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Match" WHERE id = ${data.matchId} FOR UPDATE`;
      const match = await tx.match.findFirst({
        where: { id: data.matchId, deletedAt: null, type: "PICKUP" },
      });
      if (!match) throw new AuthError("Ese partido no existe.");
      if (match.organizerId !== user.id)
        throw new AuthError("Solo quien organiza puede reportar el resultado.");
      if (match.startsAt > new Date()) throw new AuthError("El partido todavía no empieza.");
      if (!["OPEN", "FULL", "CONFIRMED", "PLAYED"].includes(match.status)) {
        throw new AuthError("El resultado de este partido ya está cerrado.");
      }

      const roster = await tx.matchParticipant.findMany({
        where: { matchId: match.id, status: { in: ["REGISTERED", "ATTENDED", "NO_SHOW"] } },
      });
      const noShow = new Set(data.noShowIds);
      if (noShow.has(match.organizerId))
        throw new AuthError("El organizador no puede marcarse como ausente.");
      const played = roster.filter((p) => !noShow.has(p.userId));

      const sideIssue = sidesProblem(played.map((p) => p.side));
      if (sideIssue) throw new AuthError(sideIssue);

      const sideOf = new Map(played.map((p) => [p.userId, p.side!]));
      for (const g of data.goals) {
        if (!sideOf.has(g.userId)) throw new AuthError("Un goleador no jugó este partido.");
      }
      if (data.mvpId && !sideOf.has(data.mvpId))
        throw new AuthError("El MVP tiene que ser alguien que jugó.");
      const goalIssue = goalsProblem({
        scoreA: data.scoreA,
        scoreB: data.scoreB,
        goals: data.goals.map((g) => ({ side: sideOf.get(g.userId)!, count: g.count })),
      });
      if (goalIssue) throw new AuthError(goalIssue);

      // Reemplaza un reporte anterior (corrección)
      await tx.goal.deleteMany({ where: { matchId: match.id } });
      await tx.resultReport.deleteMany({ where: { matchId: match.id } });
      await tx.resultObjection.deleteMany({ where: { matchId: match.id } });

      for (const p of roster) {
        await tx.matchParticipant.update({
          where: { id: p.id },
          data: { status: noShow.has(p.userId) ? "NO_SHOW" : "ATTENDED" },
        });
      }
      if (data.goals.length) {
        await tx.goal.createMany({
          data: data.goals.map((g) => ({
            matchId: match.id,
            scorerId: g.userId,
            side: sideOf.get(g.userId)!,
            count: g.count,
          })),
        });
      }
      await tx.resultReport.create({
        data: {
          matchId: match.id,
          reporterId: user.id,
          scoreA: data.scoreA,
          scoreB: data.scoreB,
          mvpId: data.mvpId ?? null,
        },
      });
      const now = new Date();
      await tx.match.update({
        where: { id: match.id },
        data: { status: "PLAYED", scoreA: data.scoreA, scoreB: data.scoreB, resultDueAt: resultDueAt(now) },
      });
    });
    refresh();
    return { reported: true };
  });
}

/** Un jugador que estuvo en el partido objeta el resultado. Si objeta más de la mitad, queda en disputa. */
export async function objectResult(input: unknown) {
  return runAction(matchIdSchema, input, async ({ matchId }) => {
    const user = await requireUser();
    const disputed = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Match" WHERE id = ${matchId} FOR UPDATE`;
      const match = await tx.match.findFirst({ where: { id: matchId, deletedAt: null } });
      if (!match || match.status !== "PLAYED") throw new AuthError("Ya no se puede objetar este resultado.");
      const me = await tx.matchParticipant.findUnique({
        where: { matchId_userId: { matchId, userId: user.id } },
      });
      if (me?.status !== "ATTENDED") throw new AuthError("Solo quienes jugaron pueden objetar.");
      if (match.organizerId === user.id) throw new AuthError("Si te equivocaste, corrige el resultado.");
      await tx.resultObjection.upsert({
        where: { matchId_userId: { matchId, userId: user.id } },
        create: { matchId, userId: user.id },
        update: {},
      });
      const [objections, attended] = await Promise.all([
        tx.resultObjection.count({ where: { matchId } }),
        tx.matchParticipant.count({ where: { matchId, status: "ATTENDED" } }),
      ]);
      if (isDisputed(objections, attended)) {
        await tx.match.update({ where: { id: matchId }, data: { status: "DISPUTED" } });
        return true;
      }
      return false;
    });
    refresh();
    return { disputed };
  });
}

/** Retirar mi objeción. */
export async function withdrawObjection(input: unknown) {
  return runAction(matchIdSchema, input, async ({ matchId }) => {
    const user = await requireUser();
    await db.resultObjection.deleteMany({ where: { matchId, userId: user.id, match: { status: "PLAYED" } } });
    refresh();
    return { withdrawn: true };
  });
}

/** Valorar a otro jugador del mismo partido: 1–5 estrellas y hasta 3 etiquetas. Se puede cambiar. */
export async function reviewPlayer(input: unknown) {
  return runAction(peerReviewSchema, input, async ({ matchId, targetId, score, tags }) => {
    const user = await requireUser();
    if (targetId === user.id) throw new AuthError("No puedes valorarte a ti mismo.");
    const match = await db.match.findFirst({
      where: { id: matchId, deletedAt: null, status: { in: ["PLAYED", "RESULT_CONFIRMED", "DISPUTED"] } },
    });
    if (!match) throw new AuthError("Este partido todavía no se puede valorar.");
    const limit = new Date(match.startsAt.getTime() + REVIEW_WINDOW_DAYS * 86400_000);
    if (new Date() > limit) throw new AuthError("Ya pasó una semana: este partido no se puede valorar.");

    const both = await db.matchParticipant.findMany({
      where: { matchId, userId: { in: [user.id, targetId] }, status: "ATTENDED" },
    });
    if (both.length !== 2) throw new AuthError("Solo pueden valorarse quienes jugaron este partido.");

    await db.peerReview.upsert({
      where: { matchId_authorId_targetId: { matchId, authorId: user.id, targetId } },
      create: { matchId, authorId: user.id, targetId, score, tags },
      update: { score, tags },
    });
    refresh();
    return { score };
  });
}
