import { z } from "zod";

/** Normaliza un celular chileno a "+56 9 XXXX XXXX". Acepta espacios, guiones y con/sin +56. */
export function normalizeChileanPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("56") ? digits.slice(2) : digits;
  if (!/^9\d{8}$/.test(local)) return null;
  return `+56 9 ${local.slice(1, 5)} ${local.slice(5)}`;
}

export const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeChileanPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Usa un celular chileno, ej. +56 9 1234 5678" });
      return z.NEVER;
    }
    return n;
  });

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Mínimo 3 caracteres")
  .max(24, "Máximo 24 caracteres")
  .regex(/^[a-z0-9_.]+$/, "Solo letras, números, punto y guion bajo");

export const positionSchema = z.enum(["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"]);
export const skillLevelSchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
export const footSchema = z.enum(["RIGHT", "LEFT", "BOTH"]);
export const idSchema = z.cuid();
