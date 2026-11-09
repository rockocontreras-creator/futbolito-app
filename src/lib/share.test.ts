import { describe, expect, it } from "vitest";
import { pickupShareText, requestShareText, whatsappTo, whatsappUrl } from "./share";

describe("pickupShareText", () => {
  const base = {
    playersPerSide: 7,
    startsAt: new Date("2026-11-08T23:00:00Z"),
    venueName: "Cancha El Estadio",
    url: "https://futbolito.cl/partidos/abc",
  };
  it("arma el mensaje con fecha chilena, cancha y cupos", () => {
    expect(pickupShareText({ ...base, missing: 3 })).toBe(
      "⚽ Revoltijo 7v7 el dom 8 nov · 20:00 en Cancha El Estadio. Faltan 3. ¿Te sumas? https://futbolito.cl/partidos/abc",
    );
  });
  it("usa singular cuando falta uno", () => {
    expect(pickupShareText({ ...base, missing: 1 })).toContain("¡Falta 1!");
  });
  it("avisa la lista de espera si está completo", () => {
    expect(pickupShareText({ ...base, missing: 0 })).toContain("lista de espera");
  });
});

describe("whatsappUrl", () => {
  it("codifica el texto", () => {
    expect(whatsappUrl("hola mundo ¿sí?")).toBe("https://wa.me/?text=hola%20mundo%20%C2%BFs%C3%AD%3F");
  });
});

describe("whatsappTo", () => {
  it("arma el link con el celular chileno", () => {
    expect(whatsappTo("+56 9 1234 5678")).toBe("https://wa.me/56912345678");
    expect(whatsappTo("+56 9 1234 5678", "hola")).toBe("https://wa.me/56912345678?text=hola");
  });
  it("rechaza números que no son celulares chilenos", () => {
    expect(whatsappTo("+56 2 2123 4567")).toBeNull();
  });
});

describe("requestShareText", () => {
  it("dice cuántos faltan y qué posición", () => {
    const t = requestShareText({
      playersNeeded: 1,
      positions: ["Arquero"],
      startsAt: new Date("2026-11-14T23:00:00Z"),
      venueName: "La Sintética",
      url: "https://x/se-busca/1",
    });
    expect(t).toContain("Nos falta 1 (arquero)");
    expect(t).toContain("sáb 14 nov · 20:00");
  });
});
