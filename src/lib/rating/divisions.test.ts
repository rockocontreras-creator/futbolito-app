import { describe, expect, it } from "vitest";
import { divisionFor } from "./divisions";

describe("divisionFor", () => {
  it.each([
    [500, "Bronce"],
    [899, "Bronce"],
    [900, "Plata"],
    [1099, "Plata"],
    [1100, "Oro"],
    [1299, "Oro"],
    [1300, "Platino"],
    [1499, "Platino"],
    [1500, "Diamante"],
    [2400, "Diamante"],
  ])("%i → %s", (rating, label) => {
    expect(divisionFor(rating).label).toBe(label);
  });
});
