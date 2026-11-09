import { z } from "zod";

const password = z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre").max(60),
  email: z.email("Revisa el correo").trim().toLowerCase(),
  password,
});

// "identifier" acepta correo o nombre de usuario del perfil (ej: "rocko" o "@rocko").
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Escribe tu correo o usuario")
    .transform((v) => v.replace(/^@/, "").toLowerCase()),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
