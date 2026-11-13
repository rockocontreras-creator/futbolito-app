// Carta de jugador (pedido del equipo 2026-11-13): un número general y seis atributos de 40 a 99,
// calculados con las estadísticas reales del perfil. Funciones puras; nada se guarda.

export interface CardInput {
  rating: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  mvps: number;
  registrations: number;
  attendances: number;
  /** Promedio de valoraciones de compañeros (1–5), o null si no tiene. */
  reviewAverage: number | null;
  reviewCount: number;
}

export type CardStatId = "GOL" | "VIC" | "MVP" | "ASI" | "VAL" | "EXP";

export interface CardStat {
  id: CardStatId;
  label: string;
  /** Qué mide, para la leyenda bajo la carta. */
  help: string;
  value: number;
}

export const CARD_MIN = 40;
export const CARD_MAX = 99;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Lleva un valor entre 0 y 1 a la escala de la carta (40–99). */
const toCard = (x: number) => Math.round(CARD_MIN + clamp01(x) * (CARD_MAX - CARD_MIN));

/** Número grande de la carta: sale del rango (Elo). 1000 → 65, cada 100 puntos son 6 más. */
export function overallFromRating(rating: number): number {
  return Math.min(CARD_MAX, Math.max(CARD_MIN, Math.round(65 + (rating - 1000) * 0.06)));
}

/**
 * Atributos de la carta. Con pocos partidos se acercan a un valor neutro (así un 1 de 1 no es un 99)
 * y se van despegando a medida que el jugador suma partidos.
 */
export function cardStats(p: CardInput): CardStat[] {
  const n = Math.max(0, p.matchesPlayed);
  const results = p.wins + p.draws + p.losses;
  // Goles por partido: 1,5 o más por partido es el tope.
  const gol = p.goals / (n + 2) / 1.5;
  // Rendimiento: victorias (los empates valen la mitad), partiendo de 30 %.
  const vic = (p.wins + 0.5 * p.draws + 0.9) / (results + 3);
  // Figura del partido: serlo 1 de cada 3 partidos es el tope.
  const mvp = p.mvps / (n + 3) / (1 / 3);
  // Asistencia: bajo 50 % es el mínimo; parte en 75 %.
  const attendance = (p.attendances + 1.5) / (p.registrations + 2);
  const asi = (attendance - 0.5) / 0.5;
  // Valoración de compañeros (1–5), partiendo de 3.
  const reviews = Math.max(0, p.reviewCount);
  const score = ((p.reviewAverage ?? 3) * reviews + 3 * 2) / (reviews + 2);
  const val = (score - 1) / 4;
  // Experiencia: sube rápido al principio y se aplana (25 partidos ≈ 77).
  const exp = 1 - Math.exp(-n / 25);

  return [
    { id: "GOL", label: "Goles", help: "Goles por partido", value: toCard(gol) },
    { id: "VIC", label: "Victorias", help: "Partidos ganados", value: toCard(vic) },
    { id: "MVP", label: "Figura", help: "Veces figura del partido", value: toCard(mvp) },
    { id: "ASI", label: "Asistencia", help: "Llega cuando se inscribe", value: toCard(asi) },
    { id: "VAL", label: "Valoración", help: "Nota de sus compañeros", value: toCard(val) },
    { id: "EXP", label: "Experiencia", help: "Partidos jugados", value: toCard(exp) },
  ];
}

export const POSITION_ABBR = {
  GOALKEEPER: "ARQ",
  DEFENDER: "DEF",
  MIDFIELDER: "MED",
  FORWARD: "DEL",
  FLEX: "COM",
} as const;

/** Nombre que va en la carta: el apodo si tiene; si no, nombre y primer apellido. */
export function cardName(displayName: string, nickname: string | null | undefined): string {
  const nick = nickname?.trim();
  if (nick) return nick;
  return displayName.trim().split(/\s+/).slice(0, 2).join(" ");
}
