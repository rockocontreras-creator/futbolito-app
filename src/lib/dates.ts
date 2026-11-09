import { TZDate } from "@date-fns/tz";
import { addDays, startOfDay } from "date-fns";
import { TIMEZONE } from "@/config/site";

export type WhenFilter = "hoy" | "semana" | "todos";

/** Rango de fechas para los filtros "Hoy" / "Esta semana" (7 días), en hora de Chile. */
export function dateRangeFor(when: WhenFilter, now: Date = new Date()): { gte: Date; lt?: Date } {
  if (when === "todos") return { gte: now };
  const end = addDays(startOfDay(new TZDate(now, TIMEZONE)), when === "hoy" ? 1 : 7);
  return { gte: now, lt: new Date(end.getTime()) };
}

/**
 * Convierte el valor de un <input type="datetime-local"> ("2026-11-14T20:00"),
 * que el usuario escribe en hora de Chile, a un Date absoluto. Null si es inválido.
 */
export function parseLocalDateTime(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as [number, number, number, number, number, number];
  const date = new TZDate(y, mo - 1, d, h, mi, TIMEZONE);
  if (Number.isNaN(date.getTime()) || date.getMonth() !== mo - 1) return null;
  return new Date(date.getTime());
}

/** Valor para un <input type="datetime-local"> a partir de un Date, en hora de Chile. */
export function toLocalDateTimeValue(date: Date): string {
  const z = new TZDate(date, TIMEZONE);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${z.getFullYear()}-${pad(z.getMonth() + 1)}-${pad(z.getDate())}T${pad(z.getHours())}:${pad(z.getMinutes())}`;
}

/** Sugerencia para un partido nuevo: mañana a las 20:00 en Chile. */
export function suggestedPickupStart(now: Date = new Date()): string {
  return `${toLocalDateTimeValue(new Date(now.getTime() + 86_400_000)).slice(0, 10)}T20:00`;
}
