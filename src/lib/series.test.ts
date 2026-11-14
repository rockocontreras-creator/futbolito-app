import { TZDate } from "@date-fns/tz";
import { describe, expect, it } from "vitest";
import { nextWeeklyStart, seriesLabel, weeklySlot } from "./series";

const chile = (y: number, mo: number, d: number, h: number, mi = 0) =>
  new Date(new TZDate(y, mo - 1, d, h, mi, "America/Santiago").getTime());
const localHour = (d: Date) => new TZDate(d, "America/Santiago").getHours();

describe("weeklySlot", () => {
  it("saca el día y la hora de Chile", () => {
    // jueves 19 nov 2026, 21:00 en Chile
    expect(weeklySlot(chile(2026, 11, 19, 21))).toEqual({ weekday: 4, timeLocal: "21:00" });
    expect(weeklySlot(chile(2026, 11, 22, 9, 30))).toEqual({ weekday: 0, timeLocal: "09:30" });
  });
});

describe("nextWeeklyStart", () => {
  const thursday9pm = { weekday: 4, timeLocal: "21:00" };
  it("da la semana siguiente si el partido de esta semana ya empezó", () => {
    expect(nextWeeklyStart(thursday9pm, chile(2026, 11, 19, 21))).toEqual(chile(2026, 11, 26, 21));
    expect(nextWeeklyStart(thursday9pm, chile(2026, 11, 19, 23))).toEqual(chile(2026, 11, 26, 21));
  });
  it("da el mismo día si todavía no llega la hora", () => {
    expect(nextWeeklyStart(thursday9pm, chile(2026, 11, 19, 10))).toEqual(chile(2026, 11, 19, 21));
  });
  it("da el jueves que viene desde cualquier otro día", () => {
    expect(nextWeeklyStart(thursday9pm, chile(2026, 11, 21, 12))).toEqual(chile(2026, 11, 26, 21));
  });
  it("mantiene la hora de Chile aunque cambie el horario", () => {
    // Chile atrasa la hora el primer fin de semana de abril y la adelanta el primero de septiembre.
    let d = chile(2027, 3, 25, 21);
    for (let i = 0; i < 4; i++) {
      d = nextWeeklyStart(thursday9pm, d);
      expect(localHour(d)).toBe(21);
      expect(new TZDate(d, "America/Santiago").getDay()).toBe(4);
    }
    let s = chile(2027, 8, 26, 21);
    for (let i = 0; i < 4; i++) {
      s = nextWeeklyStart(thursday9pm, s);
      expect(localHour(s)).toBe(21);
    }
  });
});

describe("seriesLabel", () => {
  it("lo dice en simple", () => {
    expect(seriesLabel({ weekday: 4, timeLocal: "21:00" })).toBe("Todos los jueves a las 21:00");
    expect(seriesLabel({ weekday: 6, timeLocal: "10:30" })).toBe("Todos los sábados a las 10:30");
  });
});
