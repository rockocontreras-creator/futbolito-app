// Reglas puras del resultado de un revoltijo (CLAUDE.md §5.4): reporta el organizador y se confirma si la
// mayoría de los participantes no lo objeta en 24 h.

export const OBJECTION_WINDOW_HOURS = 24;

export type ResultDecision = "WAIT" | "CONFIRM" | "DISPUTE";

/** Hay disputa cuando objeta más de la mitad de quienes jugaron. */
export function isDisputed(objections: number, attended: number): boolean {
  return attended > 0 && objections * 2 > attended;
}

export function resultDecision(p: {
  now: Date;
  dueAt: Date;
  objections: number;
  attended: number;
}): ResultDecision {
  if (isDisputed(p.objections, p.attended)) return "DISPUTE";
  return p.now.getTime() >= p.dueAt.getTime() ? "CONFIRM" : "WAIT";
}

export function resultDueAt(reportedAt: Date): Date {
  return new Date(reportedAt.getTime() + OBJECTION_WINDOW_HOURS * 3600_000);
}

/** Valida que la suma de goles por lado no supere el marcador. Devuelve un mensaje o null. */
export function goalsProblem(p: {
  scoreA: number;
  scoreB: number;
  goals: readonly { side: "A" | "B"; count: number }[];
}): string | null {
  const sum = (s: "A" | "B") => p.goals.filter((g) => g.side === s).reduce((a, g) => a + g.count, 0);
  if (sum("A") > p.scoreA) return "Hay más goleadores en el equipo A que goles marcados.";
  if (sum("B") > p.scoreB) return "Hay más goleadores en el equipo B que goles marcados.";
  return null;
}

/** El equipo armado debe tener al menos 1 jugador por lado. Devuelve un mensaje o null. */
export function sidesProblem(sides: readonly ("A" | "B" | null)[]): string | null {
  if (sides.some((s) => s == null)) return "Antes de reportar, arma los equipos: hay jugadores sin lado.";
  if (!sides.includes("A") || !sides.includes("B")) return "Cada equipo necesita al menos un jugador.";
  return null;
}

/** Diferencia de promedio entre equipos y una etiqueta para mostrar qué tan parejo quedó. */
export function balanceLabel(
  avgA: number,
  avgB: number,
): { diff: number; label: string; level: "ok" | "warn" | "bad" } {
  const diff = Math.abs(avgA - avgB);
  if (diff <= 25) return { diff, label: "Muy parejo", level: "ok" };
  if (diff <= 75) return { diff, label: "Parejo", level: "ok" };
  if (diff <= 150) return { diff, label: "Algo disparejo", level: "warn" };
  return { diff, label: "Disparejo", level: "bad" };
}
