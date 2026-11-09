import { describe, expect, it } from "vitest";
import { balanceTeams, type DraftPlayer } from "./team-balance";

const p = (id: string, rating: number, isGoalkeeper = false): DraftPlayer => ({ id, rating, isGoalkeeper });

describe("balanceTeams", () => {
  it("reparte un arquero a cada lado", () => {
    const res = balanceTeams([p("gk1", 1000, true), p("gk2", 950, true), p("x", 1200), p("y", 1100)]);
    expect(res.sideA.filter((x) => x.isGoalkeeper)).toHaveLength(1);
    expect(res.sideB.filter((x) => x.isGoalkeeper)).toHaveLength(1);
  });

  it("deja los lados del mismo tamaño con cantidad par", () => {
    const players = Array.from({ length: 14 }, (_, i) => p(`p${i}`, 800 + i * 37, i < 2));
    const res = balanceTeams(players);
    expect(res.sideA).toHaveLength(7);
    expect(res.sideB).toHaveLength(7);
    expect(new Set([...res.sideA, ...res.sideB].map((x) => x.id)).size).toBe(14);
  });

  it("produce promedios parejos", () => {
    const ratings = [1450, 1320, 1210, 1180, 1100, 1040, 990, 960, 900, 870];
    const res = balanceTeams(ratings.map((r, i) => p(`p${i}`, r)));
    expect(Math.abs(res.avgA - res.avgB)).toBeLessThanOrEqual(30);
  });

  it("sigue el orden snake A, B, B, A", () => {
    const res = balanceTeams([p("1", 1400), p("2", 1300), p("3", 1200), p("4", 1100)]);
    expect(res.sideA.map((x) => x.id)).toEqual(["1", "4"]);
    expect(res.sideB.map((x) => x.id)).toEqual(["2", "3"]);
  });

  it("es determinista", () => {
    const players = [p("a", 1000), p("b", 1000), p("c", 1000, true), p("d", 900)];
    expect(balanceTeams(players)).toEqual(balanceTeams([...players].reverse()));
  });
});
