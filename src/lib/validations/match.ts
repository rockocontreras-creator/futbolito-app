import { z } from "zod";
import { idSchema } from "./common";

// Publicar un revoltijo (CLAUDE.md §5.3a).
export const createPickupSchema = z
  .object({
    comunaId: idSchema,
    venueId: idSchema.optional(),
    startsAt: z.coerce.date().refine((d) => d.getTime() > Date.now(), "La fecha debe ser futura"),
    durationMinutes: z.coerce.number().int().min(30).max(180).default(60),
    playersPerSide: z.coerce.number().int().min(4).max(11),
    maxPlayers: z.coerce.number().int().min(8).max(30),
    minRating: z.coerce.number().int().min(0).max(3000).optional(),
    maxRating: z.coerce.number().int().min(0).max(3000).optional(),
    pricePerPerson: z.coerce.number().int().min(0).max(100_000).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.maxPlayers >= d.playersPerSide * 2, {
    message: "Los cupos no alcanzan para dos equipos completos",
    path: ["maxPlayers"],
  })
  .refine((d) => d.minRating === undefined || d.maxRating === undefined || d.minRating <= d.maxRating, {
    message: "El rango mínimo no puede ser mayor que el máximo",
    path: ["maxRating"],
  });

export const reportResultSchema = z.object({
  matchId: idSchema,
  scoreA: z.coerce.number().int().min(0).max(99),
  scoreB: z.coerce.number().int().min(0).max(99),
  mvpId: idSchema.optional(),
});

export const peerReviewSchema = z.object({
  matchId: idSchema,
  targetId: idSchema,
  score: z.coerce.number().int().min(1).max(5),
});
