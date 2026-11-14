// Tiempos de los avisos de un partido. Funciones puras.

/** Desde cuántas horas antes se pregunta "¿Vas o no vas?". */
export const GOING_WINDOW_HOURS = 10;
/** Cuántas horas antes llega el recordatorio. */
export const REMINDER_HOURS = 2;

const HOUR = 3_600_000;
const UPCOMING = ["OPEN", "FULL", "CONFIRMED"];

/** ¿Está abierta la pregunta "¿Vas o no vas?" para este partido? */
export function goingWindowOpen(startsAt: Date, status: string, now: Date = new Date()): boolean {
  if (!UPCOMING.includes(status)) return false;
  const left = startsAt.getTime() - now.getTime();
  return left > 0 && left <= GOING_WINDOW_HOURS * HOUR;
}

/** ¿Toca mandar el recordatorio? */
export function reminderDue(startsAt: Date, status: string, now: Date = new Date()): boolean {
  if (!UPCOMING.includes(status)) return false;
  const left = startsAt.getTime() - now.getTime();
  return left > 0 && left <= REMINDER_HOURS * HOUR;
}

/** "en 2 horas", "en 45 minutos": para el texto del recordatorio. */
export function timeLeftLabel(startsAt: Date, now: Date = new Date()): string {
  const minutes = Math.max(1, Math.round((startsAt.getTime() - now.getTime()) / 60_000));
  if (minutes >= 105) return `en ${Math.round(minutes / 60)} horas`;
  if (minutes >= 75) return "en una hora y media";
  if (minutes >= 50) return "en una hora";
  return `en ${minutes} minutos`;
}
