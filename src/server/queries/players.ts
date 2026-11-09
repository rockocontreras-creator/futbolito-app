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
