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
