import "server-only";
import { db } from "@/lib/db";

/** Canchas que puede elegir un usuario: aprobadas + las que él mismo propuso. */
export function listSelectableVenues(comunaId: string, userId: string) {
  return db.venue.findMany({
    where: { comunaId, OR: [{ status: "APPROVED" }, { status: "PENDING", proposedById: userId }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true, status: true },
  });
}
