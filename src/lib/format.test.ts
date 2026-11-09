import { describe, expect, it } from "vitest";
import { ageFrom, formatCLP, formatMatchDate } from "./format";

describe("formatMatchDate", () => {
  it("usa hora de Chile y formato corto", () => {
    // 2026-11-08 23:00 UTC = 20:00 en Santiago (UTC-3, horario de verano)
    expect(formatMatchDate(new Date("2026-11-08T23:00:00Z"))).toBe("dom 8 nov · 20:00");
  });
});

describe("ageFrom", () => {
  it("calcula años cumplidos", () => {
    expect(ageFrom(new Date("2000-11-09"), new Date("2026-11-08"))).toBe(25);
  });
});

describe("formatCLP", () => {
  it("formatea pesos chilenos", () => {
    expect(formatCLP(5000)).toMatch(/\$\s?5\.000/);
  });
});
