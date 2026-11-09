import { describe, expect, it } from "vitest";
import { joinBlocker, matchStatusFor, promoteFromWaitlist, statusForNewPlayer } from "./pickup-roster";

const base = {
  rating: 1000,
  minRating: null,
  maxRating: null,
  startsAt: new Date("2026-11-14T23:00:00Z"),
  now: new Date("2026-11-10T12:00:00Z"),
  status: "OPEN",
};

describe("joinBlocker", () => {
  it("deja sumarse a un revoltijo abierto", () => expect(joinBlocker(base)).toBeNull());
  it("deja sumarse a uno lleno (va a la lista de espera)", () =>
    expect(joinBlocker({ ...base, status: "FULL" })).toBeNull());
  it("bloquea partidos cancelados", () =>
    expect(joinBlocker({ ...base, status: "CANCELLED" })).toMatch(/cancelado/));
  it("bloquea partidos que ya empezaron", () =>
    expect(joinBlocker({ ...base, now: new Date("2026-11-15T00:00:00Z") })).toMatch(/empezó/));
  it("respeta el rango mínimo", () =>
    expect(joinBlocker({ ...base, minRating: 1100 })).toMatch(/1100 o más/));
  it("respeta el rango máximo", () =>
    expect(joinBlocker({ ...base, maxRating: 950 })).toMatch(/950 o menos/));
});

describe("statusForNewPlayer / matchStatusFor", () => {
  it("inscribe mientras haya cupos", () => {
    expect(statusForNewPlayer(13, 14)).toBe("REGISTERED");
    expect(statusForNewPlayer(14, 14)).toBe("WAITLIST");
  });
  it("marca lleno al completar cupos", () => {
    expect(matchStatusFor(13, 14)).toBe("OPEN");
    expect(matchStatusFor(14, 14)).toBe("FULL");
  });
});

describe("promoteFromWaitlist", () => {
  const waitlist = [
    { id: "segundo", joinedAt: new Date("2026-11-10T10:05:00Z") },
    { id: "primero", joinedAt: new Date("2026-11-10T10:00:00Z") },
  ];
  it("sube al primero que llegó cuando se baja un inscrito", () =>
    expect(promoteFromWaitlist("REGISTERED", waitlist)).toBe("primero"));
  it("no sube a nadie si el que se baja estaba en espera", () =>
    expect(promoteFromWaitlist("WAITLIST", waitlist)).toBeNull());
  it("no sube a nadie si la lista está vacía", () =>
    expect(promoteFromWaitlist("REGISTERED", [])).toBeNull());
});
