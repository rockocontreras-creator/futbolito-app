import { describe, expect, it } from "vitest";
import { dateRangeFor, parseLocalDateTime, toLocalDateTimeValue } from "./dates";

describe("parseLocalDateTime", () => {
  it("interpreta la hora en Chile (verano, UTC-3)", () => {
    expect(parseLocalDateTime("2026-11-14T20:00")?.toISOString()).toBe("2026-11-14T23:00:00.000Z");
  });
  it("interpreta la hora en Chile (invierno, UTC-4)", () => {
    expect(parseLocalDateTime("2026-07-10T20:00")?.toISOString()).toBe("2026-07-11T00:00:00.000Z");
  });
  it.each(["", "2026-11-14", "2026-13-01T10:00", "2026-02-30T10:00", "hola"])("rechaza %s", (v) => {
    expect(parseLocalDateTime(v)).toBeNull();
  });
  it("ida y vuelta con toLocalDateTimeValue", () => {
    const d = parseLocalDateTime("2026-12-24T21:30")!;
    expect(toLocalDateTimeValue(d)).toBe("2026-12-24T21:30");
  });
});

describe("dateRangeFor", () => {
  const now = new Date("2026-11-09T04:30:00Z"); // 01:30 del lunes 9 en Chile
  it("'hoy' termina a la medianoche de Chile", () => {
    expect(dateRangeFor("hoy", now).lt?.toISOString()).toBe("2026-11-10T03:00:00.000Z");
  });
  it("'semana' cubre 7 días", () => {
    expect(dateRangeFor("semana", now).lt?.toISOString()).toBe("2026-11-16T03:00:00.000Z");
  });
  it("'todos' no tiene fin", () => {
    expect(dateRangeFor("todos", now)).toEqual({ gte: now });
  });
});
