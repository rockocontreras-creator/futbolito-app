import { describe, expect, it } from "vitest";
import {
  balanceLabel,
  confirmationsNeeded,
  goalsProblem,
  isDisputed,
  resultDecision,
  sidesProblem,
} from "./match-result";

describe("resultado del revoltijo", () => {
  it("necesita más de la mitad", () => {
    expect(confirmationsNeeded(10)).toBe(6);
    expect(confirmationsNeeded(9)).toBe(5);
    expect(confirmationsNeeded(1)).toBe(1);
  });

  it("se confirma al llegar a la mayoría y antes queda pendiente", () => {
    expect(resultDecision({ confirmations: 5, objections: 0, attended: 10 })).toBe("WAIT");
    expect(resultDecision({ confirmations: 6, objections: 0, attended: 10 })).toBe("CONFIRM");
  });

  it("queda en disputa cuando ya no se puede llegar a la mayoría", () => {
    expect(isDisputed(4, 10)).toBe(false);
    expect(isDisputed(5, 10)).toBe(true);
    expect(resultDecision({ confirmations: 3, objections: 5, attended: 10 })).toBe("DISPUTE");
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
