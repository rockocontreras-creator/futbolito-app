import { describe, expect, it } from "vitest";
import { isMinor, profileBadges } from "./profile-badges";

const now = new Date("2026-11-10T12:00:00Z");
const ids = (p: Parameters<typeof profileBadges>[0]) => profileBadges(p, now).map((b) => b.label);

describe("profileBadges", () => {
  it("jugadora", () => {
    expect(ids({ gender: "FEMALE" })).toEqual(["Jugadora"]);
  });
  it("viejo crack con más de 35", () => {
    expect(ids({ birthDate: new Date("1990-01-01") })).toEqual(["Viejo crack"]); // 36
    expect(ids({ birthDate: new Date("1991-06-01") })).toEqual([]); // 35
  });
  it("joven promesa si es menor de 18", () => {
    expect(ids({ birthDate: new Date("2011-01-01") })).toEqual(["Joven promesa"]); // 15
    expect(ids({ birthDate: new Date("2008-01-01") })).toEqual([]); // 18
  });
  it("comodín y combinaciones", () => {
    expect(ids({ gender: "FEMALE", birthDate: new Date("1980-01-01"), primaryPosition: "FLEX" })).toEqual([
      "Jugadora",
      "Viejo crack",
      "Comodín",
    ]);
  });
});

describe("isMinor", () => {
  it("detecta menores de 18", () => {
    expect(isMinor(new Date("2010-05-01"), now)).toBe(true);
    expect(isMinor(new Date("2000-05-01"), now)).toBe(false);
    expect(isMinor(null, now)).toBe(false);
  });
});
