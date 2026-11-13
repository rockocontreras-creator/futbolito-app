import { describe, expect, it } from "vitest";
import { canSendCode, cleanCode, codeState } from "./email-code";

const now = new Date("2026-11-12T12:00:00Z");
const ago = (s: number) => new Date(now.getTime() - s * 1000);

describe("canSendCode", () => {
  it("deja mandar el primero", () => expect(canSendCode([], now)).toEqual({ ok: true }));
  it("pide esperar un minuto entre códigos", () => {
    expect(canSendCode([ago(20)], now)).toEqual({ ok: false, reason: "cooldown", waitSeconds: 40 });
    expect(canSendCode([ago(61)], now)).toEqual({ ok: true });
  });
  it("máximo 5 por hora", () => {
    const r = canSendCode([ago(100), ago(500), ago(900), ago(1200), ago(3000)], now);
    expect(r).toEqual({ ok: false, reason: "hourly", waitSeconds: 600 });
    expect(canSendCode([ago(100), ago(500), ago(900), ago(1200), ago(4000)], now).ok).toBe(true);
  });
});

describe("codeState", () => {
  const fresh = { expiresAt: new Date(now.getTime() + 60_000), attempts: 0 };
  it("acepta el código correcto y vigente", () => expect(codeState(fresh, true, now)).toBe("ok"));
  it("rechaza el incorrecto", () => expect(codeState(fresh, false, now)).toBe("wrong"));
  it("vence a los 15 minutos", () =>
    expect(codeState({ ...fresh, expiresAt: ago(1) }, true, now)).toBe("expired"));
  it("se bloquea tras 5 intentos aunque luego acierte", () =>
    expect(codeState({ ...fresh, attempts: 5 }, true, now)).toBe("locked"));
  it("sin código", () => expect(codeState(null, true, now)).toBe("missing"));
});

it("limpia espacios y guiones del código", () => expect(cleanCode(" 123-456 ")).toBe("123456"));
