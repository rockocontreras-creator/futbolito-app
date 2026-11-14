import { describe, expect, it } from "vitest";
import { goingWindowOpen, reminderDue, timeLeftLabel } from "./match-timing";

const now = new Date("2026-11-19T12:00:00Z");
const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000);

describe("goingWindowOpen", () => {
  it("abre 10 horas antes y cierra al empezar", () => {
    expect(goingWindowOpen(inHours(11), "OPEN", now)).toBe(false);
    expect(goingWindowOpen(inHours(10), "OPEN", now)).toBe(true);
    expect(goingWindowOpen(inHours(0.5), "FULL", now)).toBe(true);
    expect(goingWindowOpen(inHours(0), "FULL", now)).toBe(false);
    expect(goingWindowOpen(inHours(-1), "OPEN", now)).toBe(false);
  });
  it("no aplica a partidos cancelados o ya jugados", () => {
    expect(goingWindowOpen(inHours(3), "CANCELLED", now)).toBe(false);
    expect(goingWindowOpen(inHours(3), "PLAYED", now)).toBe(false);
  });
});

describe("reminderDue", () => {
  it("toca desde 2 horas antes", () => {
    expect(reminderDue(inHours(2.5), "OPEN", now)).toBe(false);
    expect(reminderDue(inHours(2), "OPEN", now)).toBe(true);
    expect(reminderDue(inHours(0.2), "CONFIRMED", now)).toBe(true);
    expect(reminderDue(inHours(-0.1), "OPEN", now)).toBe(false);
    expect(reminderDue(inHours(1), "CANCELLED", now)).toBe(false);
  });
});

describe("timeLeftLabel", () => {
  it("redondea a algo que se dice en voz alta", () => {
    expect(timeLeftLabel(inHours(2), now)).toBe("en 2 horas");
    expect(timeLeftLabel(inHours(1.9), now)).toBe("en 2 horas");
    expect(timeLeftLabel(inHours(1.5), now)).toBe("en una hora y media");
    expect(timeLeftLabel(inHours(1), now)).toBe("en una hora");
    expect(timeLeftLabel(inHours(0.5), now)).toBe("en 30 minutos");
  });
});
