import "server-only";
import { db } from "@/lib/db";

export function listLeagues(comunaId: string) {
  return db.league.findMany({
    where: { comunaId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      organizer: { select: { name: true, profile: { select: { displayName: true } } } },
      seasons: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { name: true, status: true, _count: { select: { teams: true } } },
      },
    },
  });
}
