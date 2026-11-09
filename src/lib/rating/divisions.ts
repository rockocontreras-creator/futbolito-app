// Divisiones visibles del rango (CLAUDE.md §6).

export type DivisionId = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";

export interface Division {
  id: DivisionId;
  label: string;
  /** Rating mínimo (incluido). */
  min: number;
}

// Ordenadas de mayor a menor para buscar la primera que calce.
export const DIVISIONS: readonly Division[] = [
  { id: "DIAMOND", label: "Diamante", min: 1500 },
  { id: "PLATINUM", label: "Platino", min: 1300 },
  { id: "GOLD", label: "Oro", min: 1100 },
  { id: "SILVER", label: "Plata", min: 900 },
  { id: "BRONZE", label: "Bronce", min: Number.NEGATIVE_INFINITY },
];

export function divisionFor(rating: number): Division {
  // El último elemento (Bronce) siempre calza, así que find nunca devuelve undefined.
  return DIVISIONS.find((d) => rating >= d.min) ?? DIVISIONS[DIVISIONS.length - 1]!;
}
