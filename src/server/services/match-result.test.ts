import { describe, expect, it } from "vitest";
import {
  balanceLabel,
  goalsProblem,
  isDisputed,
  resultDecision,
  resultDueAt,
  sidesProblem,
} from "./match-result";

describe("resultado del revoltijo", () => {
  const reported = new Date("2026-11-10T23:00:00Z");
  const due = resultDueAt(reported);

  it("se confirma solo 24 h después", () => {
    expect(due.toISOString()).toBe("2026-11-11T23:00:00.000Z");
    expect(
      resultDecision({ now: new Date("2026-11-11T22:59:00Z"), dueAt: due, objections: 0, attended: 10 }),
    ).toBe("WAIT");
    expect(
      resultDecision({ now: new Date("2026-11-11T23:00:00Z"), dueAt: due, objections: 0, attended: 10 }),
    ).toBe("CONFIRM");
  });

  it("si objeta más de la mitad queda en disputa", () => {
    expect(isDisputed(5, 10)).toBe(false);
    expect(isDisputed(6, 10)).toBe(true);
    expect(resultDecision({ now: reported, dueAt: due, objections: 6, attended: 10 })).toBe("DISPUTE");
  });

  it("valida goleadores contra el marcador", () => {
    expect(
      goalsProblem({
        scoreA: 2,
        scoreB: 1,
        goals: [
          { side: "A", count: 2 },
          { side: "B", count: 1 },
        ],
      }),
    ).toBeNull();
    expect(goalsProblem({ scoreA: 1, scoreB: 0, goals: [{ side: "A", count: 2 }] })).toMatch(/equipo A/);
  });

  it("exige equipos armados", () => {
    expect(sidesProblem(["A", "B", null])).toMatch(/arma los equipos/);
    expect(sidesProblem(["A", "A"])).toMatch(/al menos un jugador/);
    expect(sidesProblem(["A", "B"])).toBeNull();
  });

  it("etiqueta la nivelación", () => {
    expect(balanceLabel(1000, 1010).label).toBe("Muy parejo");
    expect(balanceLabel(1000, 1200).level).toBe("bad");
  });
});
