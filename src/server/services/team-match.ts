import "server-only";
import { db } from "@/lib/db";
import { applyTeamMatchResult, outcomeFromScore } from "@/lib/rating/elo";
import { streakAfter, teamResultDecision } from "@/lib/team-result";

/** Jugadores que siguen en el plantel de esos equipos. */
export async function teamPlayerIds(teamIds: (string | null | undefined)[]): Promise<string[]> {
  const ids = teamIds.filter((t): t is string => Boolean(t));
  if (ids.length === 0) return [];
  const members = await db.teamMember.findMany({
    where: { teamId: { in: ids }, leftAt: null },
    select: { userId: true },
  });
  return [...new Set(members.map((m) => m.userId))];
}

export async function teamCaptainIds(teamId: string): Promise<string[]> {
  const captains = await db.teamMember.findMany({
    where: { teamId, role: "CAPTAIN", leftAt: null },
    select: { userId: true },
  });
  return captains.map((c) => c.userId);
}

export type TeamMatchOutcome = "WAIT" | "CONFIRMED" | "DISPUTED";

/**
 * Cierra un partido entre equipos según los reportes de los dos capitanes: si coinciden aplica Elo
 * (equipos y jugadores que jugaron), estadísticas e historial. Con `force`, un admin fija el marcador.
 * Es idempotente: bloquea la fila y solo actúa si el partido sigue sin confirmar.
 */
export async function finalizeTeamMatch(
  matchId: string,
  force?: { scoreA: number; scoreB: number },
): Promise<TeamMatchOutcome> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Match" WHERE id = ${matchId} FOR UPDATE`;
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        resultReports: { select: { side: true, scoreA: true, scoreB: true } },
        participants: {
          where: { status: "ATTENDED" },
          include: { user: { select: { profile: true } } },
        },
      },
    });
    if (!match || match.type === "PICKUP" || !match.homeTeam || !match.awayTeam) return "WAIT";
    if (match.status === "RESULT_CONFIRMED") return "CONFIRMED";
    if (match.status === "CANCELLED") return "WAIT";

    let scoreA: number;
    let scoreB: number;
    if (force) {
      ({ scoreA, scoreB } = force);
    } else {
      const reports = match.resultReports.filter(
        (r): r is { side: "A" | "B"; scoreA: number; scoreB: number } => r.side != null,
      );
      const decision = teamResultDecision(reports);
      if (decision === "WAIT") return "WAIT";
      if (decision === "DISPUTE") {
        await tx.match.update({ where: { id: matchId }, data: { status: "DISPUTED" } });
        return "DISPUTED";
      }
      ({ scoreA, scoreB } = reports[0]!);
    }

    const playersOf = (side: "A" | "B") =>
      match.participants
        .filter((p) => p.side === side && p.user.profile)
        .map((p) => ({
          id: p.userId,
          rating: p.user.profile!.rating,
          ratedMatches: p.user.profile!.ratedMatches,
        }));
    const { homeTeam: home, awayTeam: away } = match;
    const changes = applyTeamMatchResult({
      home: { id: home.id, rating: home.rating, ratedMatches: home.ratedMatches, players: playersOf("A") },
      away: { id: away.id, rating: away.rating, ratedMatches: away.ratedMatches, players: playersOf("B") },
      scoreHome: scoreA,
      scoreAway: scoreB,
    });

    for (const [team, scoreFor, scoreAgainst] of [
      [home, scoreA, scoreB],
      [away, scoreB, scoreA],
    ] as const) {
      const change = changes.teams.find((c) => c.id === team.id)!;
      const outcome = outcomeFromScore(scoreFor, scoreAgainst);
      await tx.team.update({
        where: { id: team.id },
        data: {
          rating: change.after,
          ratedMatches: { increment: 1 },
          matchesPlayed: { increment: 1 },
          goalsFor: { increment: scoreFor },
          goalsAgainst: { increment: scoreAgainst },
          streak: streakAfter(team.streak, outcome),
          ...(outcome === 1 ? { wins: { increment: 1 } } : {}),
          ...(outcome === 0.5 ? { draws: { increment: 1 } } : {}),
          ...(outcome === 0 ? { losses: { increment: 1 } } : {}),
        },
      });
      await tx.ratingHistory.create({
        data: {
          subject: "TEAM",
          teamId: team.id,
          matchId,
          before: change.before,
          after: change.after,
          delta: change.delta,
        },
      });
    }

    const changeOf = new Map(changes.players.map((c) => [c.id, c]));
    for (const p of match.participants) {
      const profile = p.user.profile;
      const change = changeOf.get(p.userId);
      if (!profile || !change || !p.side) continue;
      const outcome = p.side === "A" ? outcomeFromScore(scoreA, scoreB) : outcomeFromScore(scoreB, scoreA);
      await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          rating: change.after,
          ratedMatches: { increment: 1 },
          matchesPlayed: { increment: 1 },
          registrations: { increment: 1 },
          attendances: { increment: 1 },
          ...(outcome === 1 ? { wins: { increment: 1 } } : {}),
          ...(outcome === 0.5 ? { draws: { increment: 1 } } : {}),
          ...(outcome === 0 ? { losses: { increment: 1 } } : {}),
        },
      });
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

    await tx.match.update({
      where: { id: matchId },
      data: { status: "RESULT_CONFIRMED", scoreA, scoreB, resultConfirmedAt: new Date() },
    });
    return "CONFIRMED";
  });
}
