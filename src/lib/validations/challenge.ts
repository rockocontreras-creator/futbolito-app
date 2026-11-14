import { z } from "zod";
import { parseLocalDateTime } from "@/lib/dates";
import { idSchema } from "./common";

export const TO_COORDINATE = "";

// Publicar "Buscamos rival" (CLAUDE.md §5.3b). La fecha llega en hora de Chile.
export const createChallengeSchema = z.object({
  teamId: idSchema,
  startsAtLocal: z
    .string()
    .transform((v, ctx) => {
      const d = parseLocalDateTime(v);
      if (!d) {
        ctx.addIssue({ code: "custom", message: "Elige día y hora" });
        return z.NEVER;
      }
      return d;
    })
    .refine((d) => d.getTime() > Date.now(), "La fecha tiene que ser futura"),
  /** Vacío = cancha a coordinar. */
  venueId: z.string().max(40).default(TO_COORDINATE),
  playersPerSide: z.coerce.number().int().min(4).max(11),
  notes: z.string().trim().max(300, "Máximo 300 letras").optional(),
  /** Desafío directo: solo ese equipo puede aceptarlo. */
  rivalSlug: z.string().trim().max(80).optional(),
});
export type CreateChallengeInput = z.input<typeof createChallengeSchema>;

export const acceptChallengeSchema = z.object({ challengeId: idSchema, teamId: idSchema });
export const challengeIdSchema = z.object({ challengeId: idSchema });

// Resultado de un partido entre equipos: lo reporta el capitán de cada lado, con quiénes jugaron.
export const teamResultSchema = z.object({
  matchId: idSchema,
  teamId: idSchema,
  scoreHome: z.coerce.number().int().min(0, "No puede ser negativo").max(99),
  scoreAway: z.coerce.number().int().min(0, "No puede ser negativo").max(99),
  playerIds: z.array(idSchema).min(1, "Marca al menos a un jugador").max(30),
});
export type TeamResultInput = z.input<typeof teamResultSchema>;
