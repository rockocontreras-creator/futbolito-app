import { describe, expect, it } from "vitest";
import { streakAfter, teamResultDecision } from "./team-result";

describe("teamResultDecision", () => {
  it("espera mientras falte un capitán", () => {
    expect(teamResultDecision([])).toBe("WAIT");
    expect(teamResultDecision([{ side: "A", scoreA: 3, scoreB: 2 }])).toBe("WAIT");
  });
  it("confirma si los dos reportan lo mismo", () => {
    expect(
      teamResultDecision([
        { side: "A", scoreA: 3, scoreB: 2 },
        { side: "B", scoreA: 3, scoreB: 2 },
      ]),
    ).toBe("CONFIRM");
  });
  it("pasa a disputa si no coinciden", () => {
    expect(
      teamResultDecision([
        { side: "A", scoreA: 3, scoreB: 2 },
        { side: "B", scoreA: 2, scoreB: 2 },
      ]),
    ).toBe("DISPUTE");
  });
});

describe("streakAfter", () => {
  it("agrega el resultado a la derecha y guarda solo cinco", () => {
    expect(streakAfter(null, 1)).toBe("G");
    expect(streakAfter("GG", 0.5)).toBe("GGE");
    expect(streakAfter("GGEPG", 0)).toBe("GEPGP");
  });
});
