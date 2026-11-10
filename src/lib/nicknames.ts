// Apodos automáticos "de la cancha" (CLAUDE.md §5.1 + pedido del equipo 2026-11-09).
// Funciones puras: se calculan a partir de estadísticas, etiquetas de las valoraciones y palabras clave de
// los comentarios. No se guardan en la BD: cambian solos a medida que el jugador juega.

import type { PlayerTagId } from "./labels";

export interface NicknameInput {
  position: "GOALKEEPER" | "DEFENDER" | "MIDFIELDER" | "FORWARD" | "FLEX";
  matchesPlayed: number;
  wins: number;
  goals: number;
  mvps: number;
  registrations: number;
  attendances: number;
  /** Cuántas veces le pusieron cada etiqueta. */
  tags: Partial<Record<PlayerTagId, number>>;
  /** Cantidad de valoraciones recibidas y su promedio (1–5). */
  reviews: { count: number; average: number | null };
  /** Texto de los comentarios recibidos (se buscan palabras clave). */
  comments: readonly string[];
}

export interface Nickname {
  id: string;
  title: string;
  reason: string;
  tone: "good" | "banter";
}

// Cuántas veces tiene que repetirse una etiqueta para volverse apodo.
const TAG_THRESHOLD = 3;

// Palabras de los comentarios que cuentan como una etiqueta más.
const KEYWORDS: Record<PlayerTagId, RegExp> = {
  GOLEADOR: /\b(golazo|goleador|la mete|letal|killer|9 de area|nueve)\b/i,
  MURALLA: /\b(muralla|muro|no pasa nadie|cerrojo)\b/i,
  PASADOR: /\b(pase|pasador|asistencia|reparte)\b/i,
  HABILIDOSO: /\b(gambeta|crack|magia|mago|caño|habilidos[oa])\b/i,
  INCANSABLE: /\b(abeja|corre todo|incansable|pulmon|pulmón|motor)\b/i,
  ATAJADOR: /\b(atajad[ao]|manos|pulpo|arquerazo|salvad[ao])\b/i,
  LIDER: /\b(lider|líder|capitan|capitán|ordena)\b/i,
  FAIR_PLAY: /\b(buena onda|buena persona|fair play|caballero|respetuos[oa])\b/i,
  CHUPON: /\b(chup[oó]n|no la pasa|no la suelta|individualista)\b/i,
  MOCHILA: /\b(mochila|no corre|caminando|paseando)\b/i,
  RECLAMON: /\b(reclam[oó]n|reclama|alega|alegon|alegón)\b/i,
  PIERNA_FUERTE: /\b(pega|patadas|pierna fuerte|carnicero|leñero)\b/i,
};

/** Suma las etiquetas de las valoraciones con las que aparecen en los comentarios (1 por comentario). */
export function tagScores(input: Pick<NicknameInput, "tags" | "comments">): Record<PlayerTagId, number> {
  const scores = Object.fromEntries(
    (Object.keys(KEYWORDS) as PlayerTagId[]).map((t) => [t, input.tags[t] ?? 0]),
  ) as Record<PlayerTagId, number>;
  for (const text of input.comments) {
    for (const tag of Object.keys(KEYWORDS) as PlayerTagId[]) {
      if (KEYWORDS[tag].test(text)) scores[tag] += 1;
    }
  }
  return scores;
}

const TAG_NICKNAMES: Record<PlayerTagId, { title: string; reason: string; tone: Nickname["tone"] }> = {
  GOLEADOR: { title: "El Busca Goles", reason: "Sus compañeros dicen que la mete", tone: "good" },
  MURALLA: { title: "La Muralla", reason: "Por su lado no pasa nadie", tone: "good" },
  PASADOR: { title: "El Profe", reason: "Reparte el juego como nadie", tone: "good" },
  HABILIDOSO: { title: "El Mago", reason: "Gambeta y caños según la gente", tone: "good" },
  INCANSABLE: { title: "La Abeja", reason: "Corre toda la cancha", tone: "good" },
  ATAJADOR: { title: "El Pulpo", reason: "Ataja hasta lo imposible", tone: "good" },
  LIDER: { title: "El Capitán", reason: "Ordena al equipo", tone: "good" },
  FAIR_PLAY: { title: "Señor Fair Play", reason: "Pura buena onda en la cancha", tone: "good" },
  CHUPON: { title: "El Chupón", reason: "Dicen que no la suelta", tone: "banter" },
  MOCHILA: { title: "La Mochila", reason: "Hay que cargarlo un poco", tone: "banter" },
  RECLAMON: { title: "El Abogado", reason: "Reclama cada jugada", tone: "banter" },
  PIERNA_FUERTE: { title: "El Leñador", reason: "Mete pierna fuerte", tone: "banter" },
};

/** Apodos ganados, del más merecido al menos. Máximo `limit`. */
export function nicknamesFor(p: NicknameInput, limit = 3): Nickname[] {
  const found: { n: Nickname; weight: number }[] = [];
  const add = (n: Nickname, weight: number) => found.push({ n, weight });

  const goalsPerMatch = p.matchesPlayed > 0 ? p.goals / p.matchesPlayed : 0;
  const attendance = p.registrations > 0 ? p.attendances / p.registrations : null;

  // Por estadísticas
  if (p.matchesPlayed === 0) {
    add(
      { id: "debut", title: "El Debutante", reason: "Todavía no juega su primer partido", tone: "good" },
      1,
    );
  }
  if (p.matchesPlayed >= 3 && goalsPerMatch >= 1.5) {
    add(
      {
        id: "goles",
        title: "El Busca Goles",
        reason: `${p.goals} goles en ${p.matchesPlayed} partidos`,
        tone: "good",
      },
      10 + goalsPerMatch,
    );
  }
  if (p.matchesPlayed >= 5 && p.goals === 0 && p.position !== "GOALKEEPER" && p.position !== "DEFENDER") {
    add(
      {
        id: "alergico",
        title: "El Alérgico al Gol",
        reason: `${p.matchesPlayed} partidos y el arco sigue esperando`,
        tone: "banter",
      },
      8,
    );
  }
  if (p.mvps >= 3) {
    add(
      { id: "figura", title: "La Figura", reason: `${p.mvps} veces el mejor de la cancha`, tone: "good" },
      9 + p.mvps,
    );
  }
  if (p.matchesPlayed >= 5 && p.wins / p.matchesPlayed >= 0.7) {
    add(
      { id: "cabala", title: "El Cábala", reason: "Con él en cancha casi siempre se gana", tone: "good" },
      7,
    );
  }
  if (p.matchesPlayed >= 20) {
    add(
      {
        id: "infaltable",
        title: "El Rey del Revoltijo",
        reason: `${p.matchesPlayed} partidos jugados`,
        tone: "good",
      },
      6,
    );
  }
  if (attendance != null && p.registrations >= 5 && attendance === 1) {
    add({ id: "puntual", title: "El Infaltable", reason: "Nunca ha faltado a un partido", tone: "good" }, 5);
  }
  if (attendance != null && p.registrations >= 4 && attendance < 0.6) {
    add({ id: "fantasma", title: "El Fantasma", reason: "Se inscribe y no aparece", tone: "banter" }, 8);
  }
  if (p.reviews.count >= 5 && (p.reviews.average ?? 0) >= 4.5) {
    add(
      {
        id: "crack",
        title: "El Crack del Barrio",
        reason: "Lo mejor evaluado por sus compañeros",
        tone: "good",
      },
      9,
    );
  }

  // Por etiquetas y comentarios
  const scores = tagScores(p);
  for (const tag of Object.keys(scores) as PlayerTagId[]) {
    const count = scores[tag];
    if (count >= TAG_THRESHOLD) {
      const base = TAG_NICKNAMES[tag];
      add({ id: `tag-${tag}`, ...base, reason: `${base.reason} (${count} votos)` }, 5 + count);
    }
  }

  // Sin repetir título (ej. "El Busca Goles" por estadística y por etiqueta).
  const seen = new Set<string>();
  return found
    .sort((a, b) => b.weight - a.weight)
    .map((f) => f.n)
    .filter((n) => (seen.has(n.title) ? false : (seen.add(n.title), true)))
    .slice(0, limit);
}
