// Textos en español para los enums (el código y la BD van en inglés).

export const MATCH_TYPE_LABEL = { PICKUP: "Revoltijo", CHALLENGE: "Desafío", LEAGUE: "Liga" } as const;

export const POSITION_LABEL = {
  GOALKEEPER: "Arquero",
  DEFENDER: "Defensa",
  MIDFIELDER: "Medio",
  FORWARD: "Delantero",
} as const;

export const FOOT_LABEL = { RIGHT: "Derecho", LEFT: "Izquierdo", BOTH: "Ambos" } as const;

export const SKILL_LABEL = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
} as const;

export const SURFACE_LABEL = {
  SYNTHETIC: "Pasto sintético",
  NATURAL: "Pasto natural",
  DIRT: "Tierra",
} as const;

export const PLAYER_TAG_LABEL = {
  GOLEADOR: "Goleador",
  MURALLA: "Muralla",
  PASADOR: "Buen pase",
  HABILIDOSO: "Habilidoso",
  INCANSABLE: "Incansable",
  ATAJADOR: "Atajador",
  LIDER: "Líder",
  FAIR_PLAY: "Buena onda",
  CHUPON: "Chupón",
  MOCHILA: "Mochila",
  RECLAMON: "Reclamón",
  PIERNA_FUERTE: "Pierna fuerte",
} as const;

export type PlayerTagId = keyof typeof PLAYER_TAG_LABEL;

/** Etiquetas que se ofrecen al valorar, separadas en buenas y "de talla". */
export const POSITIVE_TAGS: PlayerTagId[] = [
  "GOLEADOR",
  "MURALLA",
  "PASADOR",
  "HABILIDOSO",
  "INCANSABLE",
  "ATAJADOR",
  "LIDER",
  "FAIR_PLAY",
];
export const BANTER_TAGS: PlayerTagId[] = ["CHUPON", "MOCHILA", "RECLAMON", "PIERNA_FUERTE"];
