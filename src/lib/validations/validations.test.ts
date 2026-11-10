import { describe, expect, it } from "vitest";
import { toLocalDateTimeValue } from "@/lib/dates";
import { normalizeChileanPhone } from "./common";
import { createPickupSchema, NEW_VENUE } from "./match";
import { playerProfileSchema } from "./player";

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
  const tomorrow = toLocalDateTimeValue(new Date(Date.now() + 86_400_000));
  const base = {
    venueId: "cjld2cjxh0000qzrmn831i7rn",
    startsAtLocal: tomorrow,
    durationMinutes: "60",
    playersPerSide: "7",
    maxPlayers: "14",
    minRating: "",
    pricePerPerson: "",
  };

  it("acepta un 7v7 con 14 cupos y campos opcionales vacíos", () => {
    const r = createPickupSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.minRating).toBeUndefined();
      expect(r.data.startsAtLocal).toBeInstanceOf(Date);
    }
  });

  it("rechaza cupos que no alcanzan para dos equipos", () => {
    expect(createPickupSchema.safeParse({ ...base, maxPlayers: "12" }).success).toBe(false);
  });

  it("rechaza fechas pasadas", () => {
    expect(createPickupSchema.safeParse({ ...base, startsAtLocal: "2020-01-01T20:00" }).success).toBe(false);
  });

  it("pide nombre si la cancha es nueva", () => {
    const r = createPickupSchema.safeParse({ ...base, venueId: NEW_VENUE, newVenueName: "" });
    expect(r.success).toBe(false);
  });
});

describe("playerProfileSchema", () => {
  const base = {
    username: "Rocko_9",
    displayName: "Rocko Contreras",
    primaryPosition: "FORWARD",
    foot: "RIGHT",
    skillLevel: "INTERMEDIATE",
    phone: "",
    secondaryPosition: "",
    birthDate: "1995-03-10",
  };
  it("normaliza el usuario a minúsculas y acepta opcionales vacíos", () => {
    const r = playerProfileSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.username).toBe("rocko_9");
  });
  it("exige fecha de nacimiento y edad mínima de 14 años", () => {
    expect(playerProfileSchema.safeParse({ ...base, birthDate: "" }).success).toBe(false);
    expect(playerProfileSchema.safeParse({ ...base, birthDate: "2020-01-01" }).success).toBe(false);
  });
  it("acepta el comodín como posición", () => {
    expect(playerProfileSchema.safeParse({ ...base, primaryPosition: "FLEX" }).success).toBe(true);
  });
  it("rechaza posición secundaria igual a la principal", () => {
    expect(playerProfileSchema.safeParse({ ...base, secondaryPosition: "FORWARD" }).success).toBe(false);
  });
});
