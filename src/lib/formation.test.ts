import { describe, expect, it } from "vitest";
import { formationsFor, getFormation, parseLineup, sanitizeLineup, slotsFor } from "./formation";

describe("formationsFor", () => {
  it("cada formación tiene tantos puestos como jugadores por lado", () => {
    for (let n = 4; n <= 11; n++) {
      const options = formationsFor(n);
      expect(options.length).toBeGreaterThanOrEqual(3);
      for (const f of options) {
        expect(slotsFor(f)).toHaveLength(n);
        expect(f.key.startsWith(`${n}:`)).toBe(true);
      }
    }
  });
  it("fuera de rango usa el formato más cercano", () => {
    expect(slotsFor(formationsFor(3)[0]!)).toHaveLength(4);
    expect(slotsFor(formationsFor(15)[0]!)).toHaveLength(11);
  });
});

describe("getFormation", () => {
  it("respeta la guardada si es de este formato y si no propone la primera", () => {
    expect(getFormation("7:3-2-1", 7).label).toBe("3-2-1");
    expect(getFormation("5:2-2", 7).label).toBe("2-3-1");
    expect(getFormation(null, 5).label).toBe("2-2");
  });
});

describe("slotsFor", () => {
  it("el puesto 0 es el arquero y los demás quedan dentro de la cancha, sin encimarse", () => {
    const slots = slotsFor(getFormation("7:2-3-1", 7));
    expect(slots[0]).toMatchObject({ slot: 0, role: "Arquero" });
    expect(slots.map((s) => s.role)).toEqual([
      "Arquero",
      "Defensa",
      "Defensa",
      "Medio",
      "Medio",
      "Medio",
      "Delantero",
    ]);
    for (const s of slots) {
      expect(s.x).toBeGreaterThan(5);
      expect(s.x).toBeLessThan(95);
      expect(s.y).toBeGreaterThan(5);
      expect(s.y).toBeLessThan(95);
    }
    expect(new Set(slots.map((s) => `${s.x},${s.y}`)).size).toBe(slots.length);
  });
});

describe("sanitizeLineup", () => {
  const members = new Set(["ana", "beto"]);
  it("acepta plantel e invitados y ordena por puesto", () => {
    expect(
      sanitizeLineup(
        [
          { slot: 3, guest: "  El   primo de Beto " },
          { slot: 0, userId: "ana" },
        ],
        5,
        members,
      ),
    ).toEqual([
      { slot: 0, userId: "ana" },
      { slot: 3, guest: "El primo de Beto" },
    ]);
  });
  it("saca puestos que no existen o repetidos, jugadores ajenos o repetidos e invitados sin nombre", () => {
    expect(
      sanitizeLineup(
        [
          { slot: 0, userId: "ana" },
          { slot: 0, guest: "Otro" },
          { slot: 1, userId: "ana" },
          { slot: 2, userId: "intruso" },
          { slot: 3, guest: "   " },
          { slot: 9, guest: "Fuera" },
          { slot: 1.5, guest: "Medio puesto" },
          { slot: 4, userId: "beto" },
        ],
        5,
        members,
      ),
    ).toEqual([
      { slot: 0, userId: "ana" },
      { slot: 4, userId: "beto" },
    ]);
  });
  it("corta los nombres largos", () => {
    const [entry] = sanitizeLineup([{ slot: 1, guest: "x".repeat(80) }], 5, members);
    expect(entry).toEqual({ slot: 1, guest: "x".repeat(24) });
  });
});

describe("parseLineup", () => {
  it("ignora lo que no tenga la forma esperada", () => {
    expect(parseLineup(null)).toEqual([]);
    expect(parseLineup([{ slot: 1, guest: "Tito" }, "x", { slot: "2" }, { slot: 2, userId: 7 }])).toEqual([
      { slot: 1, guest: "Tito" },
      { slot: 2 },
    ]);
  });
});
