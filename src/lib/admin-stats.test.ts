import { describe, expect, it } from "vitest";
import { countByHour, countByWeek, topCounts, weekBuckets } from "./admin-stats";

// Domingo 15 de noviembre de 2026, 16:52 en Chile (UTC−3).
const now = new Date("2026-11-15T19:52:00Z");

describe("weekBuckets", () => {
  it("arma semanas de lunes a domingo en hora de Chile, terminando en la actual", () => {
    const buckets = weekBuckets(now, 3);
    expect(buckets.map((b) => b.label)).toEqual(["26 oct", "2 nov", "9 nov"]);
    // Lunes 9 de noviembre 00:00 en Chile = 03:00 UTC.
    expect(buckets[2]!.start.toISOString()).toBe("2026-11-09T03:00:00.000Z");
    expect(buckets[2]!.end.toISOString()).toBe("2026-11-16T03:00:00.000Z");
    expect(buckets[1]!.end).toEqual(buckets[2]!.start);
  });
});

describe("countByWeek", () => {
  it("cuenta cada fecha en su semana y deja fuera las demás", () => {
    const buckets = weekBuckets(now, 3);
    const counts = countByWeek(
      [
        new Date("2026-11-09T02:59:00Z"), // domingo 8 a las 23:59 en Chile → semana del 2
        new Date("2026-11-09T03:00:00Z"), // lunes 9 a las 00:00 → semana del 9
        new Date("2026-11-15T19:00:00Z"),
        new Date("2026-10-01T12:00:00Z"), // antes
        new Date("2026-11-20T12:00:00Z"), // después
      ],
      buckets,
    );
    expect(counts).toEqual([0, 1, 2]);
  });
});

describe("countByHour", () => {
  it("agrupa por hora de Chile", () => {
    expect(
      countByHour([
        new Date("2026-11-14T23:00:00Z"), // 20:00
        new Date("2026-11-13T23:30:00Z"), // 20:30
        new Date("2026-11-15T00:00:00Z"), // 21:00
      ]),
    ).toEqual([
      { hour: 20, count: 2 },
      { hour: 21, count: 1 },
    ]);
  });
});

describe("topCounts", () => {
  it("ordena de mayor a menor y corta", () => {
    expect(topCounts(["b", "a", "b", "c", "a", "b"], 2)).toEqual([
      { key: "b", count: 3 },
      { key: "a", count: 2 },
    ]);
  });
});
