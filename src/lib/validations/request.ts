import { z } from "zod";
import { parseLocalDateTime } from "@/lib/dates";
import { idSchema, positionSchema } from "./common";

const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number({ error: "Escribe un número" }).int().min(min).max(max).optional(),
  );

// "Se busca": faltan jugadores para un partido.
export const createRequestSchema = z
  .object({
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
    venueId: z.string().optional(),
    playersNeeded: z.coerce.number().int().min(1, "Al menos 1").max(11, "Máximo 11"),
    positions: z.array(positionSchema).max(4).default([]),
    minRating: optionalInt(0, 3000),
    maxRating: optionalInt(0, 3000),
    notes: z.string().trim().max(300, "Máximo 300 caracteres").optional(),
  })
  .refine((d) => d.minRating === undefined || d.maxRating === undefined || d.minRating <= d.maxRating, {
    message: "El mínimo no puede ser mayor que el máximo",
    path: ["maxRating"],
  });
export type CreateRequestInput = z.input<typeof createRequestSchema>;

export const requestIdSchema = z.object({ requestId: idSchema });
export const respondSchema = z.object({
  requestId: idSchema,
  message: z.string().trim().max(200).optional(),
});
export const answerResponseSchema = z.object({ responseId: idSchema, accept: z.boolean() });
export const closeRequestSchema = z.object({ requestId: idSchema, filled: z.boolean() });
