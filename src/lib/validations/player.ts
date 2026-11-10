import { z } from "zod";
import { ageOn, MIN_AGE } from "@/lib/profile-badges";
import { footSchema, phoneSchema, positionSchema, skillLevelSchema, usernameSchema } from "./common";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const playerProfileSchema = z
  .object({
    username: usernameSchema,
    displayName: z.string().trim().min(2, "Escribe tu nombre").max(60),
    nickname: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional()),
    // Obligatoria: la app es desde los 14 años (ver docs/DECISIONES.md).
    birthDate: z.coerce
      .date({ error: "Escribe tu fecha de nacimiento" })
      .min(new Date("1940-01-01"), "Fecha inválida")
      .refine((d) => ageOn(d) >= MIN_AGE, `Tienes que tener al menos ${MIN_AGE} años`),
    gender: z.preprocess(emptyToUndefined, z.enum(["FEMALE", "MALE", "OTHER"]).optional()),
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
