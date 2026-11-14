import { z } from "zod";

const id = z.string().min(1).max(40);

export const reviewVenueSchema = z.object({ venueId: id, status: z.enum(["APPROVED", "REJECTED"]) });

export const resolveResultSchema = z.object({
  matchId: id,
  scoreA: z.coerce.number().int().min(0).max(60),
  scoreB: z.coerce.number().int().min(0).max(60),
});

export const adminMatchSchema = z.object({ matchId: id });

export const setRoleSchema = z.object({ userId: id, role: z.enum(["PLAYER", "ORGANIZER", "ADMIN"]) });

export const setSuspendedSchema = z.object({ userId: id, suspended: z.boolean() });

const sectorName = z.string().trim().min(2, "Mínimo 2 letras").max(60, "Máximo 60 letras");
export const createSectorSchema = z.object({ name: sectorName });
export const updateSectorSchema = z.object({
  sectorId: id,
  name: sectorName.optional(),
  isActive: z.boolean().optional(),
});
