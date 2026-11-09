import { describe, expect, it } from "vitest";
import { normalizeChileanPhone } from "./common";
import { createPickupSchema } from "./match";

describe("normalizeChileanPhone", () => {
  it.each([
    ["+56 9 1234 5678", "+56 9 1234 5678"],
    ["+56912345678", "+56 9 1234 5678"],
    ["912345678", "+56 9 1234 5678"],
    ["9-1234-5678", "+56 9 1234 5678"],
  ])("%s → %s", (input, out) => {
    expect(normalizeChileanPhone(input)).toBe(out);
  });

  it.each(["12345678", "+56 2 2123 4567", "9123"])("rechaza %s", (input) => {
    expect(normalizeChileanPhone(input)).toBeNull();
  });
});

describe("createPickupSchema", () => {
  const base = {
    comunaId: "cjld2cjxh0000qzrmn831i7rn",
    startsAt: new Date(Date.now() + 86_400_000),
    playersPerSide: 7,
    maxPlayers: 14,
  };

  it("acepta un 7v7 con 14 cupos", () => {
    expect(createPickupSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza cupos que no alcanzan para dos equipos", () => {
    const r = createPickupSchema.safeParse({ ...base, maxPlayers: 12 });
    expect(r.success).toBe(false);
  });

  it("rechaza fechas pasadas", () => {
    const r = createPickupSchema.safeParse({ ...base, startsAt: new Date(Date.now() - 1000) });
    expect(r.success).toBe(false);
  });
});
