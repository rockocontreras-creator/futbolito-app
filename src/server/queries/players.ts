import "server-only";
import { db } from "@/lib/db";

export function getPublicProfile(username: string) {
  return db.playerProfile.findFirst({
    where: { username: username.toLowerCase(), user: { deletedAt: null } },
    include: { comuna: true, sector: true },
  });
}

/** Próximos partidos donde el jugador está inscrito o en espera. */
export function listPlayerUpcoming(userId: string) {
  return db.matchParticipant.findMany({
    where: {
      userId,
      status: { in: ["REGISTERED", "WAITLIST"] },
      match: {
        deletedAt: null,
        startsAt: { gte: new Date() },
        status: { in: ["OPEN", "FULL", "CONFIRMED"] },
      },
    },
    orderBy: { match: { startsAt: "asc" } },
    include: { match: { include: { venue: { select: { name: true } } } } },
    take: 5,
  });
}

/** Valoraciones, etiquetas y comentarios de un jugador: alimentan los apodos y la sección "Comunidad". */
export async function getPlayerCommunity(userId: string) {
  const [agg, tagRows, comments] = await Promise.all([
    db.peerReview.aggregate({ where: { targetId: userId }, _count: true, _avg: { score: true } }),
    db.peerReview.findMany({ where: { targetId: userId }, select: { tags: true } }),
    db.profileComment.findMany({
      where: { targetUserId: userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        body: true,
        createdAt: true,
        authorId: true,
        author: {
          select: {
            name: true,
            image: true,
            profile: { select: { displayName: true, username: true, photoUrl: true } },
          },
        },
      },
    }),
  ]);
  const tagCounts: Record<string, number> = {};
  for (const row of tagRows) for (const t of row.tags) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
  return {
    reviews: { count: agg._count, average: agg._avg.score },
    tagCounts,
    comments,
  };
}

export type PlayerCommunity = Awaited<ReturnType<typeof getPlayerCommunity>>;
