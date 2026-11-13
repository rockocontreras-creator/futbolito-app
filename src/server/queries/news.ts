import "server-only";
import { db } from "@/lib/db";
import { formatMatchDate } from "@/lib/format";

export interface NewsSlide {
  id: string;
  /** Tema de la noticia: solo para lectores de pantalla y los puntos del carrusel. */
  topic: string;
  icon: "swords" | "calendar" | "trophy" | "medal" | "score" | "search" | "shield";
  headline: string;
  stat?: string; // número grande opcional ("12", "3–2")
  statLabel?: string;
  text: string;
  href: string;
  cta: string;
  photo?: string | null;
}

/** Noticias de la portada a partir de datos reales. Se omiten las que no tienen datos todavía. */
export async function getNewsSlides(comunaId: string): Promise<NewsSlide[]> {
  const now = new Date();
  const [nextPickup, nextClash, scorer, leader, lastResult, openRequests, newestTeam] = await Promise.all([
    db.match.findFirst({
      where: {
        comunaId,
        deletedAt: null,
        type: "PICKUP",
        status: { in: ["OPEN", "FULL"] },
        startsAt: { gte: now },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        playersPerSide: true,
        maxPlayers: true,
        venue: { select: { name: true } },
        _count: { select: { participants: { where: { status: "REGISTERED" } } } },
      },
    }),
    db.match.findFirst({
      where: {
        comunaId,
        deletedAt: null,
        type: { in: ["CHALLENGE", "LEAGUE"] },
        status: { in: ["OPEN", "FULL", "CONFIRMED"] },
        startsAt: { gte: now },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        venue: { select: { name: true } },
      },
    }),
    db.playerProfile.findFirst({
      where: { comunaId, goals: { gt: 0 } },
      orderBy: [{ goals: "desc" }, { matchesPlayed: "asc" }],
      select: { displayName: true, username: true, goals: true, matchesPlayed: true, photoUrl: true },
    }),
    db.playerProfile.findFirst({
      where: { comunaId, matchesPlayed: { gt: 0 } },
      orderBy: [{ rating: "desc" }],
      select: { displayName: true, username: true, rating: true, photoUrl: true },
    }),
    db.match.findFirst({
      where: { comunaId, deletedAt: null, status: "RESULT_CONFIRMED" },
      orderBy: { resultConfirmedAt: "desc" },
      select: { id: true, scoreA: true, scoreB: true, startsAt: true, venue: { select: { name: true } } },
    }),
    db.playerRequest.count({ where: { comunaId, status: "OPEN", startsAt: { gte: now } } }),
    db.team.findFirst({
      where: { comunaId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { name: true, slug: true },
    }),
  ]);

  const slides: NewsSlide[] = [];
  if (nextClash) {
    slides.push({
      id: "enfrentamiento",
      topic: "Próximo enfrentamiento",
      icon: "swords",
      headline: `${nextClash.homeTeam?.name ?? "Por definir"} vs ${nextClash.awayTeam?.name ?? "rival por definir"}`,
      text: `El próximo desafío: ${formatMatchDate(nextClash.startsAt)}${nextClash.venue ? `, en ${nextClash.venue.name}` : ""}.`,
      href: `/partidos/${nextClash.id}`,
      cta: "Ver partido",
    });
  }
  if (nextPickup) {
    const total = nextPickup.maxPlayers ?? nextPickup.playersPerSide * 2;
    const missing = Math.max(0, total - nextPickup._count.participants);
    slides.push({
      id: "proximo",
      topic: "Próximo revoltijo",
      icon: "calendar",
      headline: `Revoltijo ${nextPickup.playersPerSide}v${nextPickup.playersPerSide} el ${formatMatchDate(nextPickup.startsAt)}`,
      stat: missing ? String(missing) : "Lleno",
      statLabel: missing ? (missing === 1 ? "cupo libre" : "cupos libres") : "lista de espera",
      text: `${nextPickup.venue ? `En ${nextPickup.venue.name}.` : "Cancha a coordinar."} Es el próximo partido de la comuna.`,
      href: `/partidos/${nextPickup.id}`,
      cta: missing ? "Sumarme" : "Ver partido",
    });
  }
  if (scorer) {
    slides.push({
      id: "goleador",
      topic: "Máximo goleador",
      icon: "trophy",
      headline: `${scorer.displayName}, el goleador de la comuna`,
      stat: String(scorer.goals),
      statLabel: scorer.goals === 1 ? "gol" : "goles",
      text: `En ${scorer.matchesPlayed} ${scorer.matchesPlayed === 1 ? "partido" : "partidos"}.`,
      href: `/jugador/${scorer.username}`,
      cta: "Ver perfil",
      photo: scorer.photoUrl,
    });
  }
  if (leader) {
    slides.push({
      id: "lider",
      topic: "N°1 del ranking",
      icon: "medal",
      headline: `${leader.displayName} lidera el ranking`,
      stat: String(leader.rating),
      statLabel: "de rango",
      text: "Es quien tiene el mejor rango de la comuna. ¿Quién lo baja?",
      href: "/ranking",
      cta: "Ver clasificación",
      photo: leader.photoUrl,
    });
  }
  if (lastResult && lastResult.scoreA != null && lastResult.scoreB != null) {
    slides.push({
      id: "resultado",
      topic: "Último resultado",
      icon: "score",
      headline: "Así terminó el último revoltijo",
      stat: `${lastResult.scoreA}–${lastResult.scoreB}`,
      statLabel: "confirmado",
      text: `${formatMatchDate(lastResult.startsAt)}${lastResult.venue ? `, en ${lastResult.venue.name}` : ""}.`,
      href: `/partidos/${lastResult.id}`,
      cta: "Ver partido",
    });
  }
  if (openRequests > 0) {
    slides.push({
      id: "se-busca",
      topic: "Se busca",
      icon: "search",
      headline:
        openRequests === 1 ? "Un partido necesita jugadores" : `${openRequests} partidos necesitan jugadores`,
      stat: String(openRequests),
      statLabel: openRequests === 1 ? "búsqueda abierta" : "búsquedas abiertas",
      text: "Si te faltaba pichanga, esta es tu oportunidad.",
      href: "/se-busca",
      cta: "Ofrecerme",
    });
  }
  if (newestTeam) {
    slides.push({
      id: "equipo",
      topic: "Equipo nuevo",
      icon: "shield",
      headline: `Nació ${newestTeam.name}`,
      text: "Es el equipo más nuevo de la comuna. Mira su plantel o pide unirte.",
      href: `/equipo/${newestTeam.slug}`,
      cta: "Ver equipo",
    });
  }
  return slides;
}
