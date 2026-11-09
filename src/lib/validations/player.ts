import { z } from "zod";
import { footSchema, phoneSchema, positionSchema, skillLevelSchema, usernameSchema } from "./common";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const playerProfileSchema = z
  .object({
    username: usernameSchema,
    displayName: z.string().trim().min(2, "Escribe tu nombre").max(60),
    nickname: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional()),
    birthDate: z.preprocess(
      emptyToUndefined,
      z.coerce
        .date({ error: "Fecha inválida" })
        .max(new Date(), "Fecha inválida")
        .min(new Date("1940-01-01"), "Fecha inválida")
        .optional(),
    ),
    phone: z.preprocess(emptyToUndefined, phoneSchema.optional()),
    sectorId: z.preprocess(emptyToUndefined, z.string().optional()),
    primaryPosition: positionSchema,
    secondaryPosition: z.preprocess(emptyToUndefined, positionSchema.optional()),
    foot: footSchema,
    skillLevel: skillLevelSchema,
  })
  .refine((d) => d.secondaryPosition !== d.primaryPosition, {
    message: "Elige una posición distinta a la principal",
    path: ["secondaryPosition"],
  });

export type PlayerProfileInput = z.input<typeof playerProfileSchema>;
