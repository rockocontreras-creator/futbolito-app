import "server-only";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/server/session";

/** El usuario actual si es admin; si no, null. Las páginas del panel parten con esto. */
export async function getAdmin() {
  const user = await getCurrentUser();
  return user && user.role === "ADMIN" && !user.suspendedAt ? user : null;
}

const RESULT_TO_REVIEW = {
  deletedAt: null,
  type: "PICKUP" as const,
  OR: [{ status: "DISPUTED" as const }, { status: "PLAYED" as const, scoreA: { not: null } }],
};

/** Números del resumen. */
export async function adminCounts() {
  const now = new Date();
  const [pendingVenues, disputed, pendingResults, users, profiles, suspended, upcoming] = await Promise.all([
    db.venue.count({ where: { status: "PENDING" } }),
    db.match.count({ where: { deletedAt: null, status: "DISPUTED" } }),
    db.match.count({ where: { deletedAt: null, type: "PICKUP", status: "PLAYED", scoreA: { not: null } } }),
    db.user.count({ where: { deletedAt: null } }),
    db.playerProfile.count(),
    db.user.count({ where: { deletedAt: null, suspendedAt: { not: null } } }),
    db.match.count({
      where: { deletedAt: null, startsAt: { gte: now }, status: { in: ["OPEN", "FULL", "CONFIRMED"] } },
    }),
  ]);
  return { pendingVenues, disputed, pendingResults, users, profiles, suspended, upcoming };
}

export function listVenuesForAdmin() {
  return db.venue.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      name: true,
      address: true,
      surface: true,
      status: true,
      latitude: true,
      longitude: true,
      referencePrice: true,
      contact: true,
      createdAt: true,
      proposedBy: { select: { name: true, profile: { select: { displayName: true, username: true } } } },
      _count: { select: { matches: true } },
    },
  });
}

/** Resultados en disputa o esperando mayoría. */
export function listResultsToReview() {
  return db.match.findMany({
    where: RESULT_TO_REVIEW,
    orderBy: [{ status: "asc" }, { startsAt: "desc" }],
    take: 50,
    select: {
      id: true,
      status: true,
      startsAt: true,
      playersPerSide: true,
      scoreA: true,
      scoreB: true,
      colorA: true,
      colorB: true,
      venue: { select: { name: true } },
      organizer: { select: { name: true, profile: { select: { displayName: true } } } },
      participants: { where: { status: "ATTENDED" }, select: { id: true } },
      _count: { select: { confirmations: true, objections: true } },
    },
  });
}

export function listUpcomingForAdmin() {
  return db.match.findMany({
    where: { deletedAt: null, startsAt: { gte: new Date() }, status: { in: ["OPEN", "FULL", "CONFIRMED"] } },
    orderBy: { startsAt: "asc" },
    take: 30,
    select: {
      id: true,
      startsAt: true,
      playersPerSide: true,
      venue: { select: { name: true } },
      organizer: { select: { name: true, profile: { select: { displayName: true } } } },
      _count: { select: { participants: { where: { status: "REGISTERED" } } } },
    },
  });
}

export function listUsersForAdmin(q: string) {
  const term = q.trim();
  return db.user.findMany({
    where: {
      deletedAt: null,
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" as const } },
              { email: { contains: term, mode: "insensitive" as const } },
              { profile: { username: { contains: term.toLowerCase() } } },
              { profile: { displayName: { contains: term, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    orderBy: [{ role: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      suspendedAt: true,
      createdAt: true,
      profile: {
        select: { displayName: true, username: true, photoUrl: true, rating: true, matchesPlayed: true },
      },
    },
  });
}

export function listSectorsForAdmin(comunaId: string) {
  return db.sector.findMany({
    where: { comunaId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: { id: true, name: true, isActive: true, _count: { select: { players: true, venues: true } } },
  });
}
