import "server-only";
import { countByHour, countByWeek, topCounts, weekBuckets } from "@/lib/admin-stats";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/server/session";

/** El usuario actual si es admin; si no, null. Las páginas del panel parten con esto. */
export async function getAdmin() {
  const user = await getCurrentUser();
  return user && user.role === "ADMIN" && !user.suspendedAt ? user : null;
}

// Resultados que un admin puede cerrar: en disputa o reportados y esperando (revoltijos y entre equipos).
const RESULT_TO_REVIEW = {
  deletedAt: null,
  OR: [{ status: "DISPUTED" as const }, { status: "PLAYED" as const, scoreA: { not: null } }],
};

/** Números del resumen. */
export async function adminCounts() {
  const now = new Date();
  const [pendingVenues, disputed, pendingResults, users, profiles, suspended, upcoming, openReports] =
    await Promise.all([
      db.venue.count({ where: { status: "PENDING" } }),
      db.match.count({ where: { deletedAt: null, status: "DISPUTED" } }),
      db.match.count({ where: { deletedAt: null, status: "PLAYED", scoreA: { not: null } } }),
      db.user.count({ where: { deletedAt: null } }),
      db.playerProfile.count(),
      db.user.count({ where: { deletedAt: null, suspendedAt: { not: null } } }),
      db.match.count({
        where: { deletedAt: null, startsAt: { gte: now }, status: { in: ["OPEN", "FULL", "CONFIRMED"] } },
      }),
      db.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    ]);
  return { pendingVenues, disputed, pendingResults, users, profiles, suspended, upcoming, openReports };
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
      type: true,
      status: true,
      startsAt: true,
      playersPerSide: true,
      scoreA: true,
      scoreB: true,
      colorA: true,
      colorB: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      resultReports: { select: { side: true, scoreA: true, scoreB: true } },
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
      type: true,
      startsAt: true,
      playersPerSide: true,
      maxPlayers: true,
      notes: true,
      venueId: true,
      isPrivate: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
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
        select: {
          displayName: true,
          nickname: true,
          username: true,
          photoUrl: true,
          rating: true,
          matchesPlayed: true,
        },
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

/** Reportes de jugadores: primero los abiertos. */
export async function listReportsForAdmin() {
  const reports = await db.report.findMany({
    where: { targetType: "USER" },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 60,
    select: {
      id: true,
      category: true,
      reason: true,
      status: true,
      resolution: true,
      createdAt: true,
      author: { select: { name: true, profile: { select: { displayName: true, username: true } } } },
      targetUser: {
        select: {
          id: true,
          name: true,
          role: true,
          suspendedAt: true,
          profile: { select: { displayName: true, username: true, photoUrl: true } },
        },
      },
    },
  });
  // Cuántos reportes acumula cada cuenta (da contexto para decidir).
  const targets = [
    ...new Set(reports.map((r) => r.targetUser?.id).filter((id): id is string => Boolean(id))),
  ];
  const totals = targets.length
    ? await db.report.groupBy({
        by: ["targetUserId"],
        where: { targetUserId: { in: targets }, status: { not: "DISMISSED" } },
        _count: true,
      })
    : [];
  const totalOf = new Map(totals.map((t) => [t.targetUserId, t._count]));
  return reports.map((r) => ({ ...r, totalAgainst: r.targetUser ? (totalOf.get(r.targetUser.id) ?? 0) : 0 }));
}

/** Canchas que se pueden elegir al editar un partido. */
export function listVenueOptions(comunaId: string) {
  return db.venue.findMany({
    where: { comunaId, status: { in: ["APPROVED", "PENDING"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function listTeamsForAdmin(q: string) {
  const term = q.trim();
  return db.team.findMany({
    where: { deletedAt: null, ...(term ? { name: { contains: term, mode: "insensitive" as const } } : {}) },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      primaryColor: true,
      secondaryColor: true,
      rating: true,
      matchesPlayed: true,
      createdAt: true,
      _count: { select: { members: { where: { leftAt: null } } } },
    },
  });
}

const authorSelect = {
  select: { name: true, profile: { select: { displayName: true, username: true } } },
} as const;

/** Lo último que se escribió en perfiles y salas, para revisar y borrar. */
export async function listContentForAdmin() {
  const [comments, messages] = await Promise.all([
    db.profileComment.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { id: true, body: true, createdAt: true, author: authorSelect, target: authorSelect },
    }),
    db.matchMessage.findMany({
      where: { deletedAt: null, match: { deletedAt: null } },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { id: true, body: true, createdAt: true, matchId: true, user: authorSelect },
    }),
  ]);
  return { comments, messages };
}

/** Historial del panel: qué hizo cada administrador. */
export function listAdminLog(action?: string) {
  return db.adminLog.findMany({
    where: action ? { action } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      summary: true,
      createdAt: true,
      admin: { select: { name: true, profile: { select: { displayName: true } } } },
    },
  });
}

/** A cuántas personas les llega un aviso general, y cuántas tienen avisos al celular. */
export async function broadcastAudience(comunaId: string) {
  const where = { deletedAt: null, suspendedAt: null, profile: { comunaId } };
  const [people, withPush, sentToday] = await Promise.all([
    db.user.count({ where }),
    db.user.count({ where: { ...where, pushSubscriptions: { some: {} } } }),
    db.adminLog.count({
      where: { action: "broadcast", createdAt: { gte: new Date(Date.now() - 86400_000) } },
    }),
  ]);
  return { people, withPush, sentToday };
}

/** Números de las últimas 8 semanas para la pestaña "Números". */
export async function getAdminStats(now = new Date()) {
  const buckets = weekBuckets(now, 8);
  const since = buckets[0]!.start;
  const monthAgo = new Date(now.getTime() - 30 * 86400_000);
  const [users, matches, active, teams, pushPeople, commends] = await Promise.all([
    db.user.findMany({ where: { deletedAt: null, createdAt: { gte: since } }, select: { createdAt: true } }),
    db.match.findMany({
      where: {
        deletedAt: null,
        startsAt: { gte: since, lte: now },
        status: { in: ["PLAYED", "RESULT_CONFIRMED", "DISPUTED"] },
      },
      select: { startsAt: true, type: true, venue: { select: { name: true } } },
    }),
    db.matchParticipant.groupBy({
      by: ["userId"],
      where: { status: "ATTENDED", match: { deletedAt: null, startsAt: { gte: monthAgo } } },
      _count: true,
      orderBy: { _count: { userId: "desc" } },
      take: 5,
    }),
    db.team.count({ where: { deletedAt: null } }),
    db.user.count({ where: { deletedAt: null, pushSubscriptions: { some: {} } } }),
    db.peerReview.count({ where: { createdAt: { gte: since }, commends: { isEmpty: false } } }),
  ]);
  const names = await db.playerProfile.findMany({
    where: { userId: { in: active.map((a) => a.userId) } },
    select: { userId: true, displayName: true, username: true },
  });
  const nameOf = new Map(names.map((n) => [n.userId, n]));
  return {
    weeks: buckets.map((b) => b.label),
    newUsers: countByWeek(
      users.map((u) => u.createdAt),
      buckets,
    ),
    played: countByWeek(
      matches.map((m) => m.startsAt),
      buckets,
    ),
    hours: countByHour(matches.map((m) => m.startsAt)),
    venues: topCounts(matches.flatMap((m) => (m.venue ? [m.venue.name] : []))),
    activePlayers: active.flatMap((a) => {
      const p = nameOf.get(a.userId);
      return p ? [{ name: p.displayName, username: p.username, matches: a._count }] : [];
    }),
    totals: {
      played: matches.length,
      pickups: matches.filter((m) => m.type === "PICKUP").length,
      newUsers: users.length,
      teams,
      pushPeople,
      commends,
    },
  };
}
