import { TZDate } from "@date-fns/tz";
import { differenceInYears, format } from "date-fns";
import { es } from "date-fns/locale";
import { TIMEZONE } from "@/config/site";

/** "dom 8 nov · 20:00" en hora de Chile, sin importar la zona del servidor. */
export function formatMatchDate(date: Date): string {
  const d = new TZDate(date, TIMEZONE);
  return format(d, "EEE d MMM '·' HH:mm", { locale: es }).replace(/\./g, "");
}

/** Edad a partir de la fecha de nacimiento (el perfil muestra solo la edad). */
export function ageFrom(birthDate: Date, now: Date = new Date()): number {
  return differenceInYears(now, birthDate);
}

/** $5.000 */
export function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "7/14" */
export function formatSlots(taken: number, total: number): string {
  return `${taken}/${total}`;
}
