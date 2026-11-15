import { describe, expect, it } from "vitest";
import { COMMENDATION_IDS, countCommends, totalCommends } from "./commendations";

describe("countCommends", () => {
  it("suma por categoría y no cuenta dos veces la misma en una valoración", () => {
    const counts = countCommends([
      { commends: ["COMPANERO", "CRACK"] },
      { commends: ["COMPANERO", "COMPANERO"] },
      { commends: [] },
      { commends: ["LIDER"] },
    ]);
    expect(counts).toEqual({ COMPANERO: 2, LIDER: 1, CRACK: 1 });
    expect(totalCommends(counts)).toBe(4);
  });
  it("parte en cero", () => {
    expect(totalCommends(countCommends([]))).toBe(0);
    expect(COMMENDATION_IDS).toEqual(["COMPANERO", "LIDER", "CRACK"]);
  });
});
