import { describe, expect, it } from "vitest";
import {
  applyPickupResult,
  applyTeamMatchResult,
  expectedScore,
  goalDiffMultiplier,
  kFactor,
  outcomeFromScore,
  ratingDelta,
} from "./elo";

describe("expectedScore", () => {
  it("es 0.5 con ratings iguales", () => {
    expect(expectedScore(1000, 1000)).toBe(0.5);
  });
  it("con 400 de diferencia el favorito espera ~0.909", () => {
    expect(expectedScore(1400, 1000)).toBeCloseTo(10 / 11, 5);
  });
  it("las expectativas de ambos lados suman 1", () => {
    expect(expectedScore(1234, 987) + expectedScore(987, 1234)).toBeCloseTo(1, 10);
  });
});

describe("kFactor", () => {
  it("40 en los primeros 10 partidos, 20 después", () => {
    expect(kFactor(0)).toBe(40);
    expect(kFactor(9)).toBe(40);
    expect(kFactor(10)).toBe(20);
    expect(kFactor(50)).toBe(20);
  });
});

describe("goalDiffMultiplier", () => {
  it.each([
    [0, 0, 1],
    [2, 1, 1],
    [3, 1, 1.5],
    [4, 1, 1.75], // (11+3)/8
    [0, 5, 2], // (11+5)/8
  ])("%i-%i → %f", (a, b, m) => {
    expect(goalDiffMultiplier(a, b)).toBe(m);
  });
});

describe("outcomeFromScore", () => {
  it("gana / empata / pierde", () => {
    expect(outcomeFromScore(3, 1)).toBe(1);
    expect(outcomeFromScore(2, 2)).toBe(0.5);
    expect(outcomeFromScore(0, 1)).toBe(0);
  });
});

describe("ratingDelta", () => {
  it("ganar entre iguales por 1 gol con K=40 da +20", () => {
    expect(ratingDelta({ rating: 1000, opponentRating: 1000, scoreFor: 1, scoreAgainst: 0, k: 40 })).toBe(20);
  });
  it("empatar contra uno más fuerte sube el rating", () => {
    expect(
      ratingDelta({ rating: 900, opponentRating: 1100, scoreFor: 2, scoreAgainst: 2, k: 20 }),
    ).toBeGreaterThan(0);
  });
  it("es de suma cero con el mismo K", () => {
    const a = ratingDelta({ rating: 1050, opponentRating: 980, scoreFor: 5, scoreAgainst: 1, k: 20 });
    const b = ratingDelta({ rating: 980, opponentRating: 1050, scoreFor: 1, scoreAgainst: 5, k: 20 });
    expect(a + b).toBeCloseTo(0, 10);
  });
});

describe("applyPickupResult", () => {
  it("usa el promedio de cada lado y el K propio de cada jugador", () => {
    const changes = applyPickupResult({
      sideA: [
        { id: "nuevo", rating: 1000, ratedMatches: 0 },
        { id: "veterano", rating: 1000, ratedMatches: 30 },
      ],
      sideB: [
        { id: "b1", rating: 900, ratedMatches: 30 },
        { id: "b2", rating: 1100, ratedMatches: 30 },
      ],
      scoreA: 4,
      scoreB: 3,
    });
    const byId = Object.fromEntries(changes.map((c) => [c.id, c]));
    // Promedios iguales (1000 vs 1000), gana A por 1 → S−E = 0.5
    expect(byId.nuevo!.delta).toBe(20); // K 40
    expect(byId.veterano!.delta).toBe(10); // K 20
    expect(byId.b1!.delta).toBe(-10);
    expect(byId.b2!.after).toBe(1090);
  });
});

describe("applyTeamMatchResult", () => {
  it("actualiza equipos con K completo y jugadores con K a la mitad", () => {
    const res = applyTeamMatchResult({
      home: {
        id: "H",
        rating: 1000,
        ratedMatches: 20,
        players: [{ id: "h1", rating: 1200, ratedMatches: 20 }],
      },
      away: { id: "A", rating: 1000, ratedMatches: 0, players: [{ id: "a1", rating: 800, ratedMatches: 0 }] },
      scoreHome: 2,
      scoreAway: 0,
    });
    const teams = Object.fromEntries(res.teams.map((c) => [c.id, c.delta]));
    const players = Object.fromEntries(res.players.map((c) => [c.id, c.delta]));
    // dif 2 → M 1.5; S−E = ±0.5
    expect(teams.H).toBe(15); // 20 · 1.5 · 0.5
    expect(teams.A).toBe(-30); // 40 · 1.5 · 0.5
    expect(players.h1).toBe(8); // 10 · 1.5 · 0.5 = 7.5 → 8
    expect(players.a1).toBe(-15); // 20 · 1.5 · 0.5
  });
});
