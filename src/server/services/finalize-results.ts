import "server-only";
import { db } from "@/lib/db";
import { applyPickupResult, outcomeFromScore } from "@/lib/rating/elo";
import { resultDecision } from "./match-result";

/**
 * Cierra los revoltijos cuyo plazo de objeción ya pasó: aplica Elo, estadísticas y RatingHistory.
 * Se llama "en perezoso" al abrir el partido, la clasificación o un perfil, así no hace falta un cron.
 * Es idempotente: bloquea la fila y solo actúa si el partido sigue en PLAYED.
 */
export async function finalizeDueResults(matchId?: string) {
  const due = await db.match.findMany({
    where: {
      status: "PLAYED",
      type: "PICKUP",
      deletedAt: null,
      ...(matchId ? { id: matchId } : { resultDueAt: { lte: new Date() } }),
    },
    select: { id: true },
    take: 20,
  });
  for (const m of due) await finalizeOne(m.id);
}

async function finalizeOne(matchId: string) {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Match" WHERE id = ${matchId} FOR UPDATE`;
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          where: { status: { in: ["ATTENDED", "NO_SHOW"] } },
          include: { user: { select: { profile: true } } },
        },
        goals: true,
        resultReports: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { objections: true } },
      },
    });
    if (!match || match.status !== "PLAYED" || !match.resultDueAt) return;
    if (match.scoreA == null || match.scoreB == null) return;

    const attended = match.participants.filter((p) => p.status === "ATTENDED" && p.user.profile);
    const decision = resultDecision({
      now: new Date(),
      dueAt: match.resultDueAt,
      objections: match._count.objections,
      attended: attended.length,
    });
    if (decision === "WAIT") return;
    if (decision === "DISPUTE") {
      await tx.match.update({ where: { id: matchId }, data: { status: "DISPUTED" } });
      return;
    }

    const toRated = (side: "A" | "B") =>
      attended
        .filter((p) => p.side === side)
        .map((p) => ({
          id: p.userId,
          rating: p.user.profile!.rating,
          ratedMatches: p.user.profile!.ratedMatches,
        }));
    const sideA = toRated("A");
    const sideB = toRated("B");
    const changes =
      sideA.length && sideB.length
        ? applyPickupResult({ sideA, sideB, scoreA: match.scoreA, scoreB: match.scoreB })
        : [];
    const changeOf = new Map(changes.map((c) => [c.id, c]));
    const goalsOf = new Map(match.goals.map((g) => [g.scorerId, g.count]));
    const mvpId = match.resultReports[0]?.mvpId ?? null;

    for (const p of match.participants) {
      const profile = p.user.profile;
      if (!profile) continue;
      if (p.status === "NO_SHOW") {
        await tx.playerProfile.update({
          where: { id: profile.id },
          data: { registrations: { increment: 1 } },
        });
        continue;
      }
      const change = changeOf.get(p.userId);
      const outcome =
        p.side === "A"
          ? outcomeFromScore(match.scoreA, match.scoreB)
          : p.side === "B"
            ? outcomeFromScore(match.scoreB, match.scoreA)
            : null;
      await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          registrations: { increment: 1 },
          attendances: { increment: 1 },
          matchesPlayed: { increment: 1 },
          goals: { increment: goalsOf.get(p.userId) ?? 0 },
          mvps: { increment: mvpId === p.userId ? 1 : 0 },
          ...(outcome === 1 ? { wins: { increment: 1 } } : {}),
          ...(outcome === 0.5 ? { draws: { increment: 1 } } : {}),
          ...(outcome === 0 ? { losses: { increment: 1 } } : {}),
          ...(change ? { rating: change.after, ratedMatches: { increment: 1 } } : {}),
        },
      });
      if (change) {
        await tx.ratingHistory.create({
          data: {
            subject: "PLAYER",
            userId: p.userId,
            matchId,
            before: change.before,
            after: change.after,
            delta: change.delta,
          },
        });
      }
    }

    await tx.match.update({
      where: { id: matchId },
      data: { status: "RESULT_CONFIRMED", resultConfirmedAt: new Date() },
    });
  });
}
