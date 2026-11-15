import { z } from "zod";
import { COMMENDATION_IDS } from "@/lib/commendations";
import { parseLocalDateTime } from "@/lib/dates";
import { idSchema } from "./common";

const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number({ error: "Escribe un número" }).int().min(min).max(max).optional(),
  );

export const NEW_VENUE = "nueva";

// Publicar un revoltijo (CLAUDE.md §5.3a). La fecha llega como "2026-11-14T20:00" en hora de Chile.
export const createPickupSchema = z
  .object({
    venueId: z.string().min(1, "Elige una cancha"),
    newVenueName: z.string().trim().max(80).optional(),
    newVenueSurface: z.enum(["SYNTHETIC", "NATURAL", "DIRT"]).optional(),
    // Ubicación marcada en el mapa (opcional). Rango amplio de Chile continental.
    newVenueLat: z.coerce.number().min(-56).max(-17).optional(),
    newVenueLng: z.coerce.number().min(-76).max(-66).optional(),
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
    durationMinutes: z.coerce.number().int().min(30, "Mínimo 30 minutos").max(180, "Máximo 3 horas"),
    playersPerSide: z.coerce.number().int().min(4).max(11),
    maxPlayers: z.coerce
      .number({ error: "Escribe cuántos cupos" })
      .int()
      .min(8, "Mínimo 8 cupos")
      .max(30, "Máximo 30 cupos"),
    minRating: optionalInt(0, 3000),
    maxRating: optionalInt(0, 3000),
    pricePerPerson: optionalInt(0, 100_000),
    notes: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
    colorA: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Elige un color")
      .default("#0e5a36"),
    colorB: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Elige un color")
      .default("#ffd23f"),
    // Pichanga fija: se vuelve a publicar sola cada semana, el mismo día y a la misma hora.
    weekly: z.boolean().default(false),
    // Privado: aparece con candado y para entrar hay que pedirlo.
    isPrivate: z.boolean().default(false),
  })
  .refine((d) => d.maxPlayers >= d.playersPerSide * 2, {
    message: "Los cupos no alcanzan para dos equipos completos",
    path: ["maxPlayers"],
  })
  .refine((d) => d.colorA.toLowerCase() !== d.colorB.toLowerCase(), {
    message: "Los equipos necesitan colores distintos",
    path: ["colorB"],
  })
  .refine((d) => d.minRating === undefined || d.maxRating === undefined || d.minRating <= d.maxRating, {
    message: "El mínimo no puede ser mayor que el máximo",
    path: ["maxRating"],
  })
  .refine((d) => d.venueId !== NEW_VENUE || (d.newVenueName?.length ?? 0) >= 3, {
    message: "Escribe el nombre de la cancha",
    path: ["newVenueName"],
  });

export type CreatePickupInput = z.input<typeof createPickupSchema>;

export const matchIdSchema = z.object({ matchId: idSchema });
export const answerGoingSchema = z.object({ matchId: idSchema, going: z.boolean() });
export const seriesIdSchema = z.object({ seriesId: idSchema });
export const answerJoinRequestSchema = z.object({ requestId: idSchema, accept: z.boolean() });

// Gestión del partido por el organizador
export const participantActionSchema = z.object({ matchId: idSchema, userId: idSchema });
export const setSideSchema = participantActionSchema.extend({ side: z.enum(["A", "B"]).nullable() });
export const moveListSchema = participantActionSchema.extend({ list: z.enum(["REGISTERED", "WAITLIST"]) });

// Resultado (revoltijo: lo reporta el organizador)
export const reportResultSchema = z.object({
  matchId: idSchema,
  scoreA: z.coerce.number().int().min(0, "No puede ser negativo").max(99),
  scoreB: z.coerce.number().int().min(0, "No puede ser negativo").max(99),
  goals: z
    .array(z.object({ userId: idSchema, count: z.coerce.number().int().min(1).max(30) }))
    .max(40)
    .default([]),
  mvpId: idSchema.optional().nullable(),
  noShowIds: z.array(idSchema).max(40).default([]),
});
export type ReportResultInput = z.input<typeof reportResultSchema>;

// Recomendar a otro jugador del mismo partido (reemplaza a las estrellas). Lista vacía = quitarlas.
export const commendSchema = z.object({
  matchId: idSchema,
  targetId: idSchema,
  commends: z
    .array(z.enum(COMMENDATION_IDS))
    .max(COMMENDATION_IDS.length)
    .transform((list) => [...new Set(list)]),
});
export type CommendInput = z.input<typeof commendSchema>;
