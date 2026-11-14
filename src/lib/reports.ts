// Reportes de jugadores (CLAUDE.md §5.9).

export const REPORT_CATEGORIES = {
  DISRESPECT: "Faltas de respeto o insultos",
  NO_SHOW: "Se inscribe y no llega",
  ROUGH_PLAY: "Juego brusco o peligroso",
  FAKE_PROFILE: "Perfil falso o datos inventados",
  OTHER: "Otro motivo",
} as const;

export type ReportCategory = keyof typeof REPORT_CATEGORIES;

export const REPORT_CATEGORY_IDS = Object.keys(REPORT_CATEGORIES) as [ReportCategory, ...ReportCategory[]];

/** Tope de reportes que una misma persona puede mandar en un día. */
export const MAX_REPORTS_PER_DAY = 5;

export function reportCategoryLabel(category: string | null | undefined): string {
  return REPORT_CATEGORIES[category as ReportCategory] ?? REPORT_CATEGORIES.OTHER;
}
