"use server";

import { db } from "@/lib/db";
import { proposeVenueSchema } from "@/lib/validations/venue";
import { runAction } from "@/server/action-result";
import { AuthError, requireUser } from "@/server/permissions";

/** Proponer una cancha. Quien la propone ya la puede usar; para el resto aparece cuando la aprueba un admin. */
export async function proposeVenue(input: unknown) {
  return runAction(proposeVenueSchema, input, async (data) => {
    const user = await requireUser();
    const profile = await db.playerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new AuthError("Crea tu perfil para proponer canchas.");
    const dup = await db.venue.findFirst({
      where: { comunaId: profile.comunaId, name: { equals: data.name, mode: "insensitive" } },
    });
    if (dup) throw new AuthError("Ya existe una cancha con ese nombre.");
    const venue = await db.venue.create({
      data: {
        ...data,
        address: data.address ?? null,
        contact: data.contact ?? null,
        referencePrice: data.referencePrice ?? null,
        comunaId: profile.comunaId,
        proposedById: user.id,
        status: user.role === "ADMIN" ? "APPROVED" : "PENDING",
      },
    });
    return { id: venue.id };
  });
}
