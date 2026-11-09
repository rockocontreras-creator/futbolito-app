import "server-only";
import { db } from "@/lib/db";

export function listTeams(comunaId: string) {
  return db.team.findMany({
    where: { comunaId, deletedAt: null },
    orderBy: [{ rating: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      secondaryColor: true,
      rating: true,
      matchesPlayed: true,
      wins: true,
      draws: true,
      losses: true,
      sector: { select: { name: true } },
      _count: { select: { members: { where: { leftAt: null } } } },
    },
  });
}

export type TeamListItem = Awaited<ReturnType<typeof listTeams>>[number];

export function getTeamBySlug(slug: string) {
  return db.team.findFirst({
    where: { slug, deletedAt: null },
    include: {
      comuna: true,
      sector: true,
      members: {
        where: { leftAt: null },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: {
                  displayName: true,
                  nickname: true,
                  username: true,
                  rating: true,
                  primaryPosition: true,
                  photoUrl: true,
                },
              },
            },
          },
        },
      },
      invitations: {
        where: { kind: "REQUEST", status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              profile: { select: { displayName: true, username: true, rating: true, primaryPosition: true } },
            },
          },
        },
      },
    },
  });
}

export type TeamDetail = NonNullable<Awaited<ReturnType<typeof getTeamBySlug>>>;

/** Equipos en los que el usuario juega hoy. */
export function listMyTeams(userId: string) {
  return db.team.findMany({
    where: { deletedAt: null, members: { some: { userId, leftAt: null } } },
    select: { id: true, name: true, slug: true, primaryColor: true, secondaryColor: true },
    orderBy: { name: "asc" },
  });
}
