// Números del panel de administración (CLAUDE.md §5.9). Funciones puras: reciben fechas y devuelven conteos.
import { TZDate } from "@date-fns/tz";
import { addWeeks, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { TIMEZONE } from "@/config/site";

export interface WeekBucket {
  start: Date;
  end: Date;
  /** Día en que parte la semana (lunes), ej. "9 nov". */
  label: string;
}

/** Las últimas `weeks` semanas (de lunes a domingo, hora de Chile). La última es la semana en curso. */
export function weekBuckets(now: Date, weeks = 8): WeekBucket[] {
  const thisMonday = startOfWeek(new TZDate(now, TIMEZONE), { weekStartsOn: 1 });
  return Array.from({ length: weeks }, (_, i) => {
    const start = addWeeks(thisMonday, i - (weeks - 1));
    return {
      start: new Date(start.getTime()),
      end: new Date(addWeeks(start, 1).getTime()),
      label: format(start, "d MMM", { locale: es }).replace(".", ""),
    };
  });
}

/** Cuántas fechas caen en cada semana. Las que quedan fuera no cuentan. */
export function countByWeek(dates: readonly Date[], buckets: readonly WeekBucket[]): number[] {
  const counts = buckets.map(() => 0);
  for (const d of dates) {
    const t = d.getTime();
    const i = buckets.findIndex((b) => t >= b.start.getTime() && t < b.end.getTime());
    if (i >= 0) counts[i]! += 1;
  }
  return counts;
}

/** Partidos por hora de inicio (hora de Chile), solo las horas con al menos uno, ordenadas por hora. */
export function countByHour(dates: readonly Date[]): { hour: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const d of dates) {
    const hour = new TZDate(d, TIMEZONE).getHours();
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }
  return [...counts].map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour - b.hour);
}

/** Los más repetidos de una lista, de mayor a menor (empates por orden alfabético). */
export function topCounts(keys: readonly string[], limit = 5): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  return [...counts]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "es"))
    .slice(0, limit);
}
