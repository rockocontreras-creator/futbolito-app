import { z } from "zod";
import {
  footSchema,
  idSchema,
  phoneSchema,
  positionSchema,
  skillLevelSchema,
  usernameSchema,
} from "./common";

export const playerProfileSchema = z
  .object({
    username: usernameSchema,
    displayName: z.string().trim().min(2, "Escribe tu nombre").max(60),
    nickname: z.string().trim().max(30).optional(),
    birthDate: z.coerce.date().max(new Date(), "Fecha inválida").optional(),
    phone: phoneSchema.optional(),
    comunaId: idSchema,
    sectorId: idSchema.optional(),
    primaryPosition: positionSchema,
    secondaryPosition: positionSchema.optional(),
    foot: footSchema,
    skillLevel: skillLevelSchema,
  })
  .refine((d) => d.secondaryPosition !== d.primaryPosition, {
    message: "La posición secundaria debe ser distinta",
    path: ["secondaryPosition"],
  });

export type PlayerProfileInput = z.input<typeof playerProfileSchema>;
