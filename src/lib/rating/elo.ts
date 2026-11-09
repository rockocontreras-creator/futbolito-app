// Sistema de rango basado en Elo (CLAUDE.md §6).
// Todo aquí son funciones puras: sin BD, sin fechas, sin efectos. Fáciles de testear.

export type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export const INITIAL_PLAYER_RATING: Record<SkillLevel, number> = {
  BEGINNER: 900,
  INTERMEDIATE: 1000,
  ADVANCED: 1100,
};

export const INITIAL_TEAM_RATING = 1000;

/** Partidos con K alto antes de estabilizar el rango. */
export const PROVISIONAL_MATCHES = 10;
export const K_PROVISIONAL = 40;
export const K_ESTABLISHED = 20;

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

/** K = 40 en los primeros 10 partidos con rango, 20 después. */
export function kFactor(ratedMatches: number): number {
  return ratedMatches < PROVISIONAL_MATCHES ? K_PROVISIONAL : K_ESTABLISHED;
}

/** M: 1 si dif ≤ 1, 1.5 si dif = 2, (11 + dif) / 8 si dif ≥ 3. */
export function goalDiffMultiplier(scoreA: number, scoreB: number): number {
  const diff = Math.abs(scoreA - scoreB);
  if (diff <= 1) return 1;
  if (diff === 2) return 1.5;
  return (11 + diff) / 8;
}

/**
 * Cambio de rating (sin redondear) para el lado A: K · M · (S − E).
 * El lado B recibe el mismo valor con signo opuesto cuando ambos usan el mismo K.
 */
export function ratingDelta(params: {
  rating: number;
  opponentRating: number;
  scoreFor: number;
  scoreAgainst: number;
  k: number;
}): number {
  const { rating, opponentRating, scoreFor, scoreAgainst, k } = params;
  const s = outcomeFromScore(scoreFor, scoreAgainst);
  const e = expectedScore(rating, opponentRating);
  const m = goalDiffMultiplier(scoreFor, scoreAgainst);
  return k * m * (s - e);
}

export function average(values: readonly number[]): number {
  if (values.length === 0) throw new Error("No se puede promediar una lista vacía");
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ─────────────────────────────────────────────────────────────
// Revoltijo: rating de cada lado = promedio de sus jugadores.
// Cada jugador recibe el cambio de su lado, con SU propio K.
// Solo afecta ratings individuales.
// ─────────────────────────────────────────────────────────────

export interface RatedPlayer {
  id: string;
  rating: number;
  ratedMatches: number;
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

  const changesFor = (
    players: readonly RatedPlayer[],
    own: number,
    opp: number,
    scoreFor: number,
    scoreAgainst: number,
  ) =>
    players.map((p) =>
      toChange(
        p.id,
        p.rating,
        ratingDelta({
          rating: own,
          opponentRating: opp,
          scoreFor,
          scoreAgainst,
          k: kFactor(p.ratedMatches),
        }),
      ),
    );

  return [...changesFor(sideA, avgA, avgB, scoreA, scoreB), ...changesFor(sideB, avgB, avgA, scoreB, scoreA)];
}

// ─────────────────────────────────────────────────────────────
// Desafío / liga: se actualiza el rating del equipo y el de cada jugador
// que participó. Los jugadores usan K a la mitad y su lado se mide con
// el rating del equipo (no el promedio de jugadores).
// ─────────────────────────────────────────────────────────────

export interface RatedTeam {
  id: string;
  rating: number;
  ratedMatches: number;
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

  const side = (team: RatedTeam, opp: RatedTeam, scoreFor: number, scoreAgainst: number) => {
    const base = { rating: team.rating, opponentRating: opp.rating, scoreFor, scoreAgainst };
    const teamChange = toChange(
      team.id,
      team.rating,
      ratingDelta({ ...base, k: kFactor(team.ratedMatches) }),
    );
    const playerChanges = team.players.map((p) =>
      toChange(p.id, p.rating, ratingDelta({ ...base, k: kFactor(p.ratedMatches) / 2 })),
    );
    return { teamChange, playerChanges };
  };

  const h = side(home, away, scoreHome, scoreAway);
  const a = side(away, home, scoreAway, scoreHome);

  return {
    teams: [h.teamChange, a.teamChange],
    players: [...h.playerChanges, ...a.playerChanges],
  };
}

function toChange(id: string, before: number, rawDelta: number): RatingChange {
  const delta = Math.round(rawDelta);
  return { id, before, after: before + delta, delta };
}
