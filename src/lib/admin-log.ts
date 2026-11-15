// Historial del panel (CLAUDE.md §5.9): qué tipo de acciones se registran y cómo se llaman.

export const ADMIN_ACTION_LABEL = {
  venue: "Canchas",
  result: "Resultados",
  match: "Partidos",
  user: "Cuentas",
  profile: "Perfiles",
  team: "Equipos",
  sector: "Sectores",
  report: "Reportes",
  content: "Comentarios y mensajes",
  broadcast: "Avisos",
} as const;

export type AdminAction = keyof typeof ADMIN_ACTION_LABEL;

/** Avisos a toda la comuna que se pueden mandar en 24 horas. */
export const MAX_BROADCASTS_PER_DAY = 3;

export function adminActionLabel(action: string): string {
  return ADMIN_ACTION_LABEL[action as AdminAction] ?? "Otros";
}
