// Sistema de rango basado en Elo, con reparto tipo FACEIT (CLAUDE.md §6).
// Todo aquí son funciones puras: sin BD, sin fechas, sin efectos. Fáciles de testear.

export type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export const INITIAL_PLAYER_RATING: Record<SkillLevel, number> = {
  BEGINNER: 900,
  INTERMEDIATE: 1000,
  ADVANCED: 1100,
};

export const INITIAL_TEAM_RATING = 1000;

/**
 * Puntos en juego por partido, al estilo FACEIT pero con menos puntaje:
 * entre lados parejos se ganan o pierden 15 (allá son 25).
 */
export const MATCH_POINTS = 30;
/** Nadie baja de aquí. */
export const RATING_FLOOR = 100;

/** Resultado real desde el punto de vista del lado A: 1 gana, 0.5 empata, 0 pierde. */
export type Outcome = 1 | 0.5 | 0;

export function outcomeFromScore(scoreA: number, scoreB: number): Outcome {
  if (scoreA > scoreB) return 1;
  if (scoreA < scoreB) return 0;
  return 0.5;
}

/** E = 1 / (1 + 10^((Rb - Ra) / 400)) */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/**
 * Cambio de puntos de un lado: MATCH_POINTS · (S − E), redondeado.
 * No importa por cuántos goles: solo quién ganó y qué tan parejo era.
 * El que gana siempre suma al menos 1 y el que pierde resta al menos 1.
 */
export function sideDelta(rating: number, opponentRating: number, outcome: Outcome): number {
  const raw = Math.round(MATCH_POINTS * (outcome - expectedScore(rating, opponentRating)));
  if (outcome === 1) return Math.max(1, raw);
  if (outcome === 0) return Math.min(-1, raw);
  return raw;
}

/** Lo que se juega un lado antes del partido: "+13 si ganan, −17 si pierden". */
export function previewPoints(
  rating: number,
  opponentRating: number,
): { win: number; draw: number; loss: number } {
  return {
    win: sideDelta(rating, opponentRating, 1),
    draw: sideDelta(rating, opponentRating, 0.5),
    loss: sideDelta(rating, opponentRating, 0),
  };
}

/** Mitad del cambio (jugadores en partidos entre equipos), sin anular una victoria o derrota. */
export function halfDelta(delta: number): number {
  if (delta === 0) return 0;
  const half = Math.round(Math.abs(delta) / 2) || 1;
  return delta > 0 ? half : -half;
}

export function average(values: readonly number[]): number {
  if (values.length === 0) throw new Error("No se puede promediar una lista vacía");
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ─────────────────────────────────────────────────────────────
// Revoltijo: rating de cada lado = promedio de sus jugadores.
// Todo el lado gana o pierde lo mismo. Solo afecta ratings individuales.
// ─────────────────────────────────────────────────────────────

export interface RatedPlayer {
  id: string;
  rating: number;
  /** Ya no cambia el cálculo; se conserva porque las estadísticas lo usan. */
  ratedMatches?: number;
}

export interface RatingChange {
  id: string;
  before: number;
  after: number;
  delta: number;
}

export function applyPickupResult(params: {
  sideA: readonly RatedPlayer[];
  sideB: readonly RatedPlayer[];
  scoreA: number;
  scoreB: number;
}): RatingChange[] {
  const { sideA, sideB, scoreA, scoreB } = params;
  const avgA = average(sideA.map((p) => p.rating));
  const avgB = average(sideB.map((p) => p.rating));
  // El lado B recibe exactamente lo contrario: suma cero entre lados.
  const deltaA = sideDelta(avgA, avgB, outcomeFromScore(scoreA, scoreB));

  return [
    ...sideA.map((p) => toChange(p.id, p.rating, deltaA)),
    ...sideB.map((p) => toChange(p.id, p.rating, -deltaA)),
  ];
}

// ─────────────────────────────────────────────────────────────
// Desafío / liga: el equipo se mueve con el cambio completo y cada
// jugador que participó con la mitad. Los lados se miden con el rating
// del equipo (no con el promedio de jugadores).
// ─────────────────────────────────────────────────────────────

export interface RatedTeam {
  id: string;
  rating: number;
  ratedMatches?: number;
  players: readonly RatedPlayer[];
}

export interface TeamMatchRatingResult {
  teams: RatingChange[];
  players: RatingChange[];
}

export function applyTeamMatchResult(params: {
  home: RatedTeam;
  away: RatedTeam;
  scoreHome: number;
  scoreAway: number;
}): TeamMatchRatingResult {
  const { home, away, scoreHome, scoreAway } = params;
  const deltaHome = sideDelta(home.rating, away.rating, outcomeFromScore(scoreHome, scoreAway));
  const deltaAway = -deltaHome;

  return {
    teams: [toChange(home.id, home.rating, deltaHome), toChange(away.id, away.rating, deltaAway)],
    players: [
      ...home.players.map((p) => toChange(p.id, p.rating, halfDelta(deltaHome))),
      ...away.players.map((p) => toChange(p.id, p.rating, halfDelta(deltaAway))),
    ],
  };
}

function toChange(id: string, before: number, delta: number): RatingChange {
  const after = Math.max(RATING_FLOOR, before + delta);
  return { id, before, after, delta: after - before };
}
