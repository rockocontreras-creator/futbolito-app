import "server-only";
import { db } from "@/lib/db";

/** Canchas que puede elegir un usuario: aprobadas + las que él mismo propuso. */
export function listSelectableVenues(comunaId: string, userId: string) {
  return db.venue.findMany({
    where: { comunaId, OR: [{ status: "APPROVED" }, { status: "PENDING", proposedById: userId }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true, status: true, latitude: true, longitude: true, surface: true },
  });
}

/** Canchas para el mapa: aprobadas, más las pendientes del propio usuario. */
export function listMapVenues(comunaId: string, userId: string | null) {
  return db.venue.findMany({
    where: {
      comunaId,
      OR: [{ status: "APPROVED" }, ...(userId ? [{ status: "PENDING" as const, proposedById: userId }] : [])],
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      surface: true,
      isCovered: true,
      hasLighting: true,
      referencePrice: true,
      contact: true,
      status: true,
      sector: { select: { name: true } },
      _count: {
        select: {
          matches: {
            where: {
              deletedAt: null,
              status: { in: ["OPEN", "FULL", "CONFIRMED"] },
              startsAt: { gte: new Date() },
            },
          },
        },
      },
    },
  });
}

export type MapVenueRow = Awaited<ReturnType<typeof listMapVenues>>[number];
