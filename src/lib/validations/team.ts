import { z } from "zod";
import { idSchema } from "./common";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Elige un color");

// Crear equipo (CLAUDE.md §5.2). El escudo con imagen llega en una fase posterior (Supabase Storage).
export const createTeamSchema = z
  .object({
    name: z.string().trim().min(3, "Mínimo 3 letras").max(40, "Máximo 40 letras"),
    primaryColor: hexColor,
    secondaryColor: hexColor,
    description: z.string().trim().max(280, "Máximo 280 caracteres").optional(),
  })
  .refine((d) => d.primaryColor.toLowerCase() !== d.secondaryColor.toLowerCase(), {
    message: "Usa dos colores distintos",
    path: ["secondaryColor"],
  });

export const teamIdSchema = z.object({ teamId: idSchema });
export const teamRequestSchema = z.object({ requestId: idSchema, accept: z.boolean() });

export type CreateTeamInput = z.input<typeof createTeamSchema>;
