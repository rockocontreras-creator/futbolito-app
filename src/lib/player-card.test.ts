import { describe, expect, it } from "vitest";
import { CARD_MAX, CARD_MIN, cardName, cardStats, overallFromRating, type CardInput } from "./player-card";

const fresh: CardInput = {
  rating: 1000,
  matchesPlayed: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goals: 0,
  mvps: 0,
  registrations: 0,
  attendances: 0,
  reviewAverage: null,
  reviewCount: 0,
};
const stat = (p: CardInput, id: string) => cardStats(p).find((s) => s.id === id)!.value;

describe("overallFromRating", () => {
  it("parte en 65 con 1000 de rango y sube 6 cada 100 puntos", () => {
    expect(overallFromRating(1000)).toBe(65);
    expect(overallFromRating(1100)).toBe(71);
    expect(overallFromRating(900)).toBe(59);
  });
  it("se queda entre 40 y 99", () => {
    expect(overallFromRating(100)).toBe(CARD_MIN);
    expect(overallFromRating(3000)).toBe(CARD_MAX);
  });
});

describe("cardStats", () => {
  it("entrega los seis atributos, siempre entre 40 y 99", () => {
    const wild: CardInput = {
      ...fresh,
      matchesPlayed: 3,
      wins: 3,
      goals: 40,
      mvps: 3,
      registrations: 3,
      attendances: 3,
      reviewAverage: 5,
      reviewCount: 30,
    };
    for (const p of [fresh, wild]) {
      const stats = cardStats(p);
      expect(stats.map((s) => s.id)).toEqual(["GOL", "VIC", "MVP", "ASI", "VAL", "EXP"]);
      for (const s of stats) {
        expect(s.value).toBeGreaterThanOrEqual(CARD_MIN);
        expect(s.value).toBeLessThanOrEqual(CARD_MAX);
      }
    }
  });
  it("un jugador nuevo parte en valores neutros, no en el máximo", () => {
    expect(stat(fresh, "GOL")).toBe(40);
    expect(stat(fresh, "EXP")).toBe(40);
    expect(stat(fresh, "VIC")).toBeLessThan(65);
    expect(stat(fresh, "VAL")).toBe(70);
  });
  it("un partido ganado no dispara las victorias", () => {
    const one = { ...fresh, matchesPlayed: 1, wins: 1 };
    const many = { ...fresh, matchesPlayed: 30, wins: 30 };
    expect(stat(one, "VIC")).toBeLessThan(75);
    expect(stat(many, "VIC")).toBeGreaterThan(90);
  });
  it("más goles por partido da más GOL", () => {
    const low = { ...fresh, matchesPlayed: 20, goals: 4 };
    const high = { ...fresh, matchesPlayed: 20, goals: 30 };
    expect(stat(high, "GOL")).toBeGreaterThan(stat(low, "GOL"));
  });
  it("faltar a los partidos baja la asistencia", () => {
    const flaky = { ...fresh, registrations: 10, attendances: 5 };
    const solid = { ...fresh, registrations: 10, attendances: 10 };
    expect(stat(flaky, "ASI")).toBeLessThan(50);
    expect(stat(solid, "ASI")).toBeGreaterThan(90);
  });
  it("la valoración sigue la nota de los compañeros", () => {
    const loved = { ...fresh, reviewAverage: 5, reviewCount: 20 };
    const meh = { ...fresh, reviewAverage: 2, reviewCount: 20 };
    expect(stat(loved, "VAL")).toBeGreaterThan(90);
    expect(stat(meh, "VAL")).toBeLessThan(60);
  });
  it("la experiencia sube con los partidos", () => {
    expect(stat({ ...fresh, matchesPlayed: 25 }, "EXP")).toBe(77);
    expect(stat({ ...fresh, matchesPlayed: 200 }, "EXP")).toBe(99);
  });
});

describe("cardName", () => {
  it("usa el apodo si hay", () => {
    expect(cardName("Matías Rojas Soto", "El Mati")).toBe("El Mati");
  });
  it("si no, nombre y primer apellido", () => {
    expect(cardName("Matías Rojas Soto", null)).toBe("Matías Rojas");
    expect(cardName("  Pipe ", "  ")).toBe("Pipe");
  });
});
