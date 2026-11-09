import { describe, expect, it } from "vitest";
import { nextFreeSlug, slugify, teamInitials } from "./slug";

describe("slugify", () => {
  it.each([
    ["Los Cracks de la Villa", "los-cracks-de-la-villa"],
    ["Ñuble Pichanga FC", "nuble-pichanga-fc"],
    ["  Atlético San Clemente!! ", "atletico-san-clemente"],
    ["!!!", ""],
  ])("%s → %s", (input, out) => {
    expect(slugify(input)).toBe(out);
  });
});

describe("nextFreeSlug", () => {
  it("usa la base si está libre", () => {
    expect(nextFreeSlug("los-cracks", [])).toBe("los-cracks");
  });
  it("agrega un número si ya existe", () => {
    expect(nextFreeSlug("los-cracks", ["los-cracks", "los-cracks-2"])).toBe("los-cracks-3");
  });
  it("tiene un nombre por defecto si la base quedó vacía", () => {
    expect(nextFreeSlug("", [])).toBe("equipo");
  });
});

describe("teamInitials", () => {
  it.each([
    ["Los Cracks de la Villa", "CV"],
    ["Atlético San Clemente", "AS"],
    ["Real", "R"],
    ["La Fc", "LF"],
  ])("%s → %s", (name, out) => {
    expect(teamInitials(name)).toBe(out);
  });
});
