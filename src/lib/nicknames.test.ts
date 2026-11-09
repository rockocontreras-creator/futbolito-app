import { describe, expect, it } from "vitest";
import { nicknamesFor, tagScores, type NicknameInput } from "./nicknames";

const base: NicknameInput = {
  position: "FORWARD",
  matchesPlayed: 0,
  wins: 0,
  goals: 0,
  mvps: 0,
  registrations: 0,
  attendances: 0,
  tags: {},
  reviews: { count: 0, average: null },
  comments: [],
};
const titles = (p: Partial<NicknameInput>) => nicknamesFor({ ...base, ...p }).map((n) => n.title);

describe("nicknamesFor", () => {
  it("al que no ha jugado le dice debutante", () => {
    expect(titles({})).toEqual(["El Debutante"]);
  });

  it("goleador por estadística", () => {
    expect(titles({ matchesPlayed: 4, goals: 8, registrations: 4, attendances: 4 })).toContain(
      "El Busca Goles",
    );
  });

  it("alérgico al gol: delantero con 5 partidos sin goles", () => {
    expect(titles({ matchesPlayed: 5, goals: 0 })).toContain("El Alérgico al Gol");
  });

  it("no le dice alérgico al gol a un arquero", () => {
    expect(titles({ position: "GOALKEEPER", matchesPlayed: 6, goals: 0 })).not.toContain(
      "El Alérgico al Gol",
    );
  });

  it("la abeja y la mochila salen de las etiquetas", () => {
    expect(titles({ matchesPlayed: 3, tags: { INCANSABLE: 4 } })).toContain("La Abeja");
    expect(titles({ matchesPlayed: 3, tags: { MOCHILA: 3 } })).toContain("La Mochila");
  });

  it("los comentarios suman a las etiquetas", () => {
    const t = titles({
      matchesPlayed: 3,
      tags: { INCANSABLE: 1 },
      comments: ["Es una abeja", "corre todo el partido"],
    });
    expect(t).toContain("La Abeja");
  });

  it("no repite el mismo apodo y respeta el límite", () => {
    const res = nicknamesFor({
      ...base,
      matchesPlayed: 6,
      goals: 12,
      mvps: 4,
      wins: 5,
      tags: { GOLEADOR: 5, MURALLA: 3, INCANSABLE: 3 },
    });
    expect(res.length).toBe(3);
    expect(new Set(res.map((n) => n.title)).size).toBe(res.length);
  });

  it("el fantasma: falta seguido", () => {
    expect(titles({ matchesPlayed: 2, registrations: 6, attendances: 2 })).toContain("El Fantasma");
  });
});

describe("tagScores", () => {
  it("cuenta una vez por comentario aunque repita la palabra", () => {
    const s = tagScores({ tags: {}, comments: ["golazo golazo golazo"] });
    expect(s.GOLEADOR).toBe(1);
  });
});
