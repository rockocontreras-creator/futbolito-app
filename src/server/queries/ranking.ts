import "server-only";
import type { Position } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export function playerRanking(comunaId: string, position?: Position) {
  return db.playerProfile.findMany({
    where: {
      comunaId,
      user: { deletedAt: null, suspendedAt: null },
      ...(position ? { primaryPosition: position } : {}),
    },
    orderBy: [{ rating: "desc" }, { matchesPlayed: "desc" }, { createdAt: "asc" }],
    take: 100,
    select: {
      userId: true,
      username: true,
      displayName: true,
      nickname: true,
      photoUrl: true,
      rating: true,
      primaryPosition: true,
      matchesPlayed: true,
      wins: true,
      draws: true,
      losses: true,
      goals: true,
    },
  });
}

export function teamRanking(comunaId: string) {
  return db.team.findMany({
    where: { comunaId, deletedAt: null },
    orderBy: [{ rating: "desc" }, { matchesPlayed: "desc" }, { createdAt: "asc" }],
    take: 100,
    select: {
      id: true,
      slug: true,
      name: true,
      primaryColor: true,
      secondaryColor: true,
      rating: true,
      matchesPlayed: true,
      wins: true,
      draws: true,
      losses: true,
      _count: { select: { members: { where: { leftAt: null } } } },
    },
  });
}
