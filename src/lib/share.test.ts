import { describe, expect, it } from "vitest";
import { pickupShareText, whatsappUrl } from "./share";

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
