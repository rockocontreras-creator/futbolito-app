// Formaciones para partidos entre equipos (CLAUDE.md §5.3b): el capitán ubica a su plantel o a invitados
// sin cuenta en una cancha dibujada. Funciones puras: nada de BD.

export type SlotRole = "Arquero" | "Defensa" | "Medio" | "Delantero";

export interface Formation {
  /** Clave que se guarda: "7:2-3-1" (jugadores por lado : líneas de defensa a ataque, sin el arquero). */
  key: string;
  label: string;
  lines: number[];
}

export interface PitchSlot {
  slot: number;
  role: SlotRole;
  /** Posición en la cancha, en porcentaje: x de izquierda a derecha, y de arriba (ataque) a abajo (arco). */
  x: number;
  y: number;
}

const LINES: Record<number, number[][]> = {
  4: [
    [2, 1],
    [1, 2],
    [1, 1, 1],
  ],
  5: [
    [2, 2],
    [1, 2, 1],
    [2, 1, 1],
  ],
  6: [
    [2, 2, 1],
    [2, 1, 2],
    [3, 2],
  ],
  7: [
    [2, 3, 1],
    [3, 2, 1],
    [3, 1, 2],
  ],
  8: [
    [3, 3, 1],
    [2, 3, 2],
    [3, 2, 2],
  ],
  9: [
    [3, 3, 2],
    [3, 4, 1],
    [4, 3, 1],
  ],
  10: [
    [3, 4, 2],
    [4, 3, 2],
    [3, 3, 3],
  ],
  11: [
    [4, 4, 2],
    [4, 3, 3],
    [3, 5, 2],
  ],
};

const clampSize = (playersPerSide: number) => Math.min(11, Math.max(4, Math.round(playersPerSide)));

/** Formaciones disponibles para un formato (5 → 5v5). La primera es la que se propone. */
export function formationsFor(playersPerSide: number): Formation[] {
  const n = clampSize(playersPerSide);
  return LINES[n]!.map((lines) => ({ key: `${n}:${lines.join("-")}`, label: lines.join("-"), lines }));
}

/** La formación guardada si corresponde a este formato; si no, la primera del formato. */
export function getFormation(key: string | null | undefined, playersPerSide: number): Formation {
  const options = formationsFor(playersPerSide);
  return options.find((f) => f.key === key) ?? options[0]!;
}

/** Puestos de una formación: el 0 es el arquero y después cada línea, de defensa a ataque. */
export function slotsFor(formation: Formation): PitchSlot[] {
  const slots: PitchSlot[] = [{ slot: 0, role: "Arquero", x: 50, y: 90 }];
  const rows = formation.lines.length;
  formation.lines.forEach((count, row) => {
    // De 70 % (defensa, cerca del arco propio) a 16 % (ataque).
    const y = rows === 1 ? 45 : 70 - (row * 54) / (rows - 1);
    const role: SlotRole = row === 0 ? "Defensa" : row === rows - 1 ? "Delantero" : "Medio";
    for (let i = 0; i < count; i++) {
      slots.push({
        slot: slots.length,
        role,
        x: Math.round(((i + 1) * 100) / (count + 1)),
        y: Math.round(y),
      });
    }
  });
  return slots;
}

/** Quién ocupa un puesto: alguien del plantel o un invitado sin cuenta (solo su nombre). */
export type LineupEntry =
  { slot: number; userId: string; guest?: undefined } | { slot: number; guest: string; userId?: undefined };

export const GUEST_NAME_MAX = 24;

/**
 * Limpia una formación antes de guardarla o mostrarla: saca puestos que no existen, puestos repetidos,
 * jugadores que no son del plantel o que aparecen dos veces, y nombres de invitados vacíos.
 */
export function sanitizeLineup(
  entries: readonly { slot: number; userId?: string | null; guest?: string | null }[],
  slotCount: number,
  memberIds: ReadonlySet<string>,
): LineupEntry[] {
  const usedSlots = new Set<number>();
  const usedPlayers = new Set<string>();
  const clean: LineupEntry[] = [];
  for (const e of entries) {
    if (!Number.isInteger(e.slot) || e.slot < 0 || e.slot >= slotCount || usedSlots.has(e.slot)) continue;
    if (e.userId) {
      if (!memberIds.has(e.userId) || usedPlayers.has(e.userId)) continue;
      usedPlayers.add(e.userId);
      clean.push({ slot: e.slot, userId: e.userId });
    } else {
      const guest = (e.guest ?? "").replace(/\s+/g, " ").trim().slice(0, GUEST_NAME_MAX);
      if (!guest) continue;
      clean.push({ slot: e.slot, guest });
    }
    usedSlots.add(e.slot);
  }
  return clean.sort((a, b) => a.slot - b.slot);
}

/** Lee lo guardado en la BD (JSON) sin confiar en su forma. */
export function parseLineup(raw: unknown): { slot: number; userId?: string; guest?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const { slot, userId, guest } = item as Record<string, unknown>;
    if (typeof slot !== "number") return [];
    return [
      {
        slot,
        ...(typeof userId === "string" ? { userId } : {}),
        ...(typeof guest === "string" ? { guest } : {}),
      },
    ];
  });
}
