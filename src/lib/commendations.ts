// Recomendaciones después del partido (CLAUDE.md §5.4): reemplazan a las estrellas.
// Como en Counter-Strike: cada uno recomienda a quien quiera, en una o más categorías.

export const COMMENDATIONS = [
  { id: "COMPANERO", label: "Buen compañero", help: "Buena onda y juega para el equipo" },
  { id: "LIDER", label: "Líder", help: "Ordena y anima al equipo" },
  { id: "CRACK", label: "Crack", help: "Jugó muy bien" },
] as const;

export type CommendationId = (typeof COMMENDATIONS)[number]["id"];
export const COMMENDATION_IDS = COMMENDATIONS.map((c) => c.id) as [CommendationId, ...CommendationId[]];

export type CommendCounts = Record<CommendationId, number>;

/** Suma las recomendaciones recibidas, por categoría. */
export function countCommends(rows: readonly { commends: readonly CommendationId[] }[]): CommendCounts {
  const counts: CommendCounts = { COMPANERO: 0, LIDER: 0, CRACK: 0 };
  for (const row of rows) for (const c of new Set(row.commends)) counts[c] += 1;
  return counts;
}

export function totalCommends(counts: CommendCounts): number {
  return counts.COMPANERO + counts.LIDER + counts.CRACK;
}
