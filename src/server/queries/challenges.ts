import "server-only";
import { db } from "@/lib/db";

const teamCard = {
  select: { id: true, name: true, slug: true, primaryColor: true, secondaryColor: true, rating: true },
} as const;

/** Desafíos abiertos de la comuna que todavía no pasan. */
export function listOpenChallenges(comunaId: string) {
  return db.challenge.findMany({
    where: {
      status: "OPEN",
      windowStart: { gt: new Date() },
      creatorTeam: { comunaId, deletedAt: null },
    },
    orderBy: { windowStart: "asc" },
    take: 50,
    select: {
      id: true,
      windowStart: true,
      playersPerSide: true,
      notes: true,
      venue: { select: { name: true } },
      creatorTeam: teamCard,
      targetTeam: teamCard,
    },
  });
}

export type OpenChallenge = Awaited<ReturnType<typeof listOpenChallenges>>[number];

/** Equipos donde el usuario es capitán. */
export function listCaptainTeams(userId: string) {
  return db.team.findMany({
    where: { deletedAt: null, members: { some: { userId, role: "CAPTAIN", leftAt: null } } },
    select: { id: true, name: true, slug: true, comunaId: true },
    orderBy: { name: "asc" },
  });
}

/** Próximos partidos de un equipo y sus últimos resultados. */
export async function listTeamMatches(teamId: string) {
  const select = {
    id: true,
    startsAt: true,
    status: true,
    scoreA: true,
    scoreB: true,
    homeTeamId: true,
    homeTeam: { select: { name: true } },
    awayTeam: { select: { name: true } },
    venue: { select: { name: true } },
  } as const;
  const where = { deletedAt: null, OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] };
  const [upcoming, played] = await Promise.all([
    db.match.findMany({
      where: { ...where, status: { in: ["CONFIRMED", "PLAYED", "DISPUTED"] } },
      orderBy: { startsAt: "asc" },
      take: 5,
      select,
    }),
    db.match.findMany({
      where: { ...where, status: "RESULT_CONFIRMED" },
      orderBy: { startsAt: "desc" },
      take: 5,
      select,
    }),
  ]);
  return { upcoming, played };
}

/** Detalle de un partido entre equipos: planteles, reportes y nómina. */
export function getTeamMatch(id: string) {
  const team = {
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      secondaryColor: true,
      rating: true,
      members: {
        where: { leftAt: null },
        orderBy: [{ role: "asc" as const }, { joinedAt: "asc" as const }],
        select: {
          userId: true,
          role: true,
          user: {
            select: {
              name: true,
              image: true,
              profile: {
                select: { displayName: true, nickname: true, username: true, photoUrl: true, rating: true },
              },
            },
          },
        },
      },
    },
  };
  return db.match.findFirst({
    where: { id, deletedAt: null, type: { not: "PICKUP" } },
    include: {
      venue: true,
      homeTeam: team,
      awayTeam: team,
      resultReports: { select: { side: true, scoreA: true, scoreB: true } },
      participants: { where: { status: "ATTENDED" }, select: { userId: true, side: true } },
    },
  });
}

export type TeamMatch = NonNullable<Awaited<ReturnType<typeof getTeamMatch>>>;
