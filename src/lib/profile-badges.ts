// Etiquetas del perfil (pedido del equipo 2026-11-09). Funciones puras.
import { differenceInYears } from "date-fns";

export const MIN_AGE = 14;
export const ADULT_AGE = 18;
export const VETERAN_AGE = 35;

export interface ProfileBadge {
  id: "jugadora" | "viejo-crack" | "joven-promesa" | "comodin";
  label: string;
}

export function ageOn(birthDate: Date, now: Date = new Date()): number {
  return differenceInYears(now, birthDate);
}

/** Menor de 18: se oculta su teléfono y su edad exacta. */
export function isMinor(birthDate: Date | null | undefined, now: Date = new Date()): boolean {
  return birthDate != null && ageOn(birthDate, now) < ADULT_AGE;
}

export function profileBadges(
  p: { gender?: string | null; birthDate?: Date | null; primaryPosition?: string | null },
  now: Date = new Date(),
): ProfileBadge[] {
  const out: ProfileBadge[] = [];
  if (p.gender === "FEMALE") out.push({ id: "jugadora", label: "Jugadora" });
  if (p.birthDate) {
    const age = ageOn(p.birthDate, now);
    if (age > VETERAN_AGE) out.push({ id: "viejo-crack", label: "Viejo crack" });
    if (age < ADULT_AGE) out.push({ id: "joven-promesa", label: "Joven promesa" });
  }
  if (p.primaryPosition === "FLEX") out.push({ id: "comodin", label: "Comodín" });
  return out;
}
