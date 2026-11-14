import { TZDate } from "@date-fns/tz";
import { TIMEZONE } from "@/config/site";

// Pichanga fija: un revoltijo que se repite cada semana a la misma hora de Chile. Funciones puras.

export interface WeeklySlot {
  /** 0 = domingo … 6 = sábado, en hora de Chile. */
  weekday: number;
  /** "21:00", en hora de Chile. */
  timeLocal: string;
}

const WEEKDAYS = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"] as const;

/** Día y hora (de Chile) en que cae un partido: de ahí sale la repetición semanal. */
export function weeklySlot(date: Date): WeeklySlot {
  const z = new TZDate(date, TIMEZONE);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { weekday: z.getDay(), timeLocal: `${pad(z.getHours())}:${pad(z.getMinutes())}` };
}

/**
 * La próxima fecha de la serie estrictamente después de `after`. Se calcula con el reloj de Chile, así
 * el partido sigue siendo "a las 21:00" aunque cambie la hora en abril o septiembre.
 */
export function nextWeeklyStart(slot: WeeklySlot, after: Date): Date {
  const [h, m] = slot.timeLocal.split(":").map(Number) as [number, number];
  const z = new TZDate(after, TIMEZONE);
  for (let add = 0; add <= 7; add++) {
    const candidate = new TZDate(z.getFullYear(), z.getMonth(), z.getDate() + add, h, m, TIMEZONE);
    if (candidate.getDay() === slot.weekday && candidate.getTime() > after.getTime()) {
      return new Date(candidate.getTime());
    }
  }
  throw new Error("No se encontró la próxima fecha de la serie");
}

/** "Todos los jueves a las 21:00" */
export function seriesLabel(slot: WeeklySlot): string {
  return `Todos los ${WEEKDAYS[slot.weekday] ?? "días"} a las ${slot.timeLocal}`;
}
