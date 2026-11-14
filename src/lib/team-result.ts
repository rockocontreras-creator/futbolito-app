// Resultado de un partido entre equipos (CLAUDE.md §5.4): cada capitán reporta el marcador.
// Si coinciden, queda confirmado; si no, pasa a disputa. Funciones puras.

export interface SideReport {
  side: "A" | "B";
  scoreA: number;
  scoreB: number;
}

export type TeamResultDecision = "WAIT" | "CONFIRM" | "DISPUTE";

export function teamResultDecision(reports: readonly SideReport[]): TeamResultDecision {
  const a = reports.find((r) => r.side === "A");
  const b = reports.find((r) => r.side === "B");
  if (!a || !b) return "WAIT";
  return a.scoreA === b.scoreA && a.scoreB === b.scoreB ? "CONFIRM" : "DISPUTE";
}

/** Racha del equipo: últimos 5 resultados, el más reciente a la derecha ("GGEPG"). */
export function streakAfter(streak: string | null | undefined, outcome: 1 | 0.5 | 0): string {
  const letter = outcome === 1 ? "G" : outcome === 0.5 ? "E" : "P";
  return `${streak ?? ""}${letter}`.slice(-5);
}
