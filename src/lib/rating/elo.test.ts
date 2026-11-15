import { describe, expect, it } from "vitest";
import {
  applyPickupResult,
  applyTeamMatchResult,
  expectedScore,
  halfDelta,
  outcomeFromScore,
  previewPoints,
  RATING_FLOOR,
  sideDelta,
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

describe("outcomeFromScore", () => {
  it("gana / empata / pierde", () => {
    expect(outcomeFromScore(3, 1)).toBe(1);
    expect(outcomeFromScore(2, 2)).toBe(0.5);
    expect(outcomeFromScore(0, 1)).toBe(0);
  });
});

describe("sideDelta", () => {
  it("entre lados parejos se ganan o pierden 15 y el empate no mueve nada", () => {
    expect(sideDelta(1000, 1000, 1)).toBe(15);
    expect(sideDelta(1000, 1000, 0)).toBe(-15);
    expect(sideDelta(1000, 1000, 0.5)).toBe(0);
  });
  it("ganarle a uno mejor da más; ganarle a uno peor da menos", () => {
    expect(sideDelta(1000, 1200, 1)).toBe(23);
    expect(sideDelta(1200, 1000, 1)).toBe(7);
    expect(sideDelta(1200, 1000, 0)).toBe(-23);
  });
  it("empatar contra uno más fuerte sube el rating", () => {
    expect(sideDelta(1000, 1200, 0.5)).toBeGreaterThan(0);
    expect(sideDelta(1200, 1000, 0.5)).toBeLessThan(0);
  });
  it("el que gana siempre suma al menos 1 y el que pierde resta al menos 1", () => {
    expect(sideDelta(2000, 900, 1)).toBe(1);
    expect(sideDelta(900, 2000, 0)).toBe(-1);
  });
  it("no depende de la diferencia de goles", () => {
    const a = applyPickupResult({
      sideA: [{ id: "a", rating: 1000 }],
      sideB: [{ id: "b", rating: 1000 }],
      scoreA: 1,
      scoreB: 0,
    });
    const b = applyPickupResult({
      sideA: [{ id: "a", rating: 1000 }],
      sideB: [{ id: "b", rating: 1000 }],
      scoreA: 9,
      scoreB: 0,
    });
    expect(a.map((c) => c.delta)).toEqual(b.map((c) => c.delta));
  });
});

describe("previewPoints", () => {
  it("muestra lo que se juega cada lado", () => {
    expect(previewPoints(1000, 1000)).toEqual({ win: 15, draw: 0, loss: -15 });
    expect(previewPoints(1100, 1000)).toEqual({ win: 11, draw: -4, loss: -19 });
  });
});

describe("halfDelta", () => {
  it("es la mitad, sin anular el resultado", () => {
    expect(halfDelta(15)).toBe(8);
    expect(halfDelta(-15)).toBe(-8);
    expect(halfDelta(1)).toBe(1);
    expect(halfDelta(-1)).toBe(-1);
    expect(halfDelta(0)).toBe(0);
  });
});

describe("applyPickupResult", () => {
  it("usa el promedio de cada lado y todo el lado recibe lo mismo", () => {
    const changes = applyPickupResult({
      sideA: [
        { id: "nuevo", rating: 1000, ratedMatches: 0 },
        { id: "veterano", rating: 1000, ratedMatches: 30 },
      ],
      sideB: [
        { id: "b1", rating: 900 },
        { id: "b2", rating: 1100 },
      ],
      scoreA: 4,
      scoreB: 3,
    });
    const byId = Object.fromEntries(changes.map((c) => [c.id, c]));
    expect(byId.nuevo!.delta).toBe(15);
    expect(byId.veterano!.delta).toBe(15);
    expect(byId.b1!.delta).toBe(-15);
    expect(byId.b2!.after).toBe(1085);
  });
  it("es de suma cero entre lados del mismo tamaño", () => {
    const changes = applyPickupResult({
      sideA: [
        { id: "a1", rating: 1037 },
        { id: "a2", rating: 1113 },
      ],
      sideB: [
        { id: "b1", rating: 964 },
        { id: "b2", rating: 1011 },
      ],
      scoreA: 2,
      scoreB: 5,
    });
    expect(changes.reduce((sum, c) => sum + c.delta, 0)).toBe(0);
  });
  it("nadie baja del piso", () => {
    const [low] = applyPickupResult({
      sideA: [{ id: "a", rating: RATING_FLOOR + 3 }],
      sideB: [{ id: "b", rating: RATING_FLOOR + 3 }],
      scoreA: 0,
      scoreB: 1,
    });
    expect(low!.after).toBe(RATING_FLOOR);
    expect(low!.delta).toBe(-3);
  });
});

describe("applyTeamMatchResult", () => {
  it("mueve a los equipos con el cambio completo y a los jugadores con la mitad", () => {
    const res = applyTeamMatchResult({
      home: { id: "H", rating: 1000, players: [{ id: "h1", rating: 1200 }] },
      away: { id: "A", rating: 1000, players: [{ id: "a1", rating: 800 }] },
      scoreHome: 2,
      scoreAway: 0,
    });
    const teams = Object.fromEntries(res.teams.map((c) => [c.id, c.delta]));
    const players = Object.fromEntries(res.players.map((c) => [c.id, c.delta]));
    expect(teams.H).toBe(15);
    expect(teams.A).toBe(-15);
    expect(players.h1).toBe(8);
    expect(players.a1).toBe(-8);
  });
});
