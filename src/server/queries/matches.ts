import "server-only";
import type { MatchType, Prisma } from "@/generated/prisma/client";
import { dateRangeFor, type WhenFilter } from "@/lib/dates";
import { db } from "@/lib/db";
import { getMatchWeather } from "@/server/weather";

const cardSelect = {
  id: true,
  type: true,
  status: true,
  startsAt: true,
  playersPerSide: true,
  maxPlayers: true,
  pricePerPerson: true,
  minRating: true,
  maxRating: true,
  venue: { select: { name: true, latitude: true, longitude: true } },
  homeTeam: { select: { name: true } },
  awayTeam: { select: { name: true } },
  participants: {
    where: { status: { in: ["REGISTERED", "ATTENDED"] } },
    select: { user: { select: { profile: { select: { rating: true } } } } },
  },
} satisfies Prisma.MatchSelect;

type RawCard = Prisma.MatchGetPayload<{ select: typeof cardSelect }>;

export interface MatchCardData {
  id: string;
  type: MatchType;
  startsAt: Date;
  playersPerSide: number;
  venueName: string | null;
  title: string;
  taken: number;
  total: number;
  pricePerPerson: number | null;
  avgRating: number | null;
  latitude: number | null;
  longitude: number | null;
  /** Se completa aparte (withWeather) solo cuando hay alerta. */
  weather?: { level: "watch" | "bad"; title: string } | null;
}

function toCard(m: RawCard): MatchCardData {
  const ratings = m.participants.map((p) => p.user.profile?.rating).filter((r): r is number => r != null);
  const total = m.maxPlayers ?? m.playersPerSide * 2;
  return {
    id: m.id,
    type: m.type,
    startsAt: m.startsAt,
    playersPerSide: m.playersPerSide,
    venueName: m.venue?.name ?? null,
    title:
      m.type === "PICKUP"
        ? `Revoltijo ${m.playersPerSide}v${m.playersPerSide}`
        : `${m.homeTeam?.name ?? "Por definir"} vs ${m.awayTeam?.name ?? "Rival por definir"}`,
    taken: m.participants.length,
    total,
    pricePerPerson: m.pricePerPerson,
    avgRating: ratings.length ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null,
    latitude: m.venue?.latitude ?? null,
    longitude: m.venue?.longitude ?? null,
  };
}

/** Agrega la alerta de clima a cada tarjeta (pronóstico cacheado por ubicación). */
export async function withWeather(cards: MatchCardData[]): Promise<MatchCardData[]> {
  return Promise.all(
    cards.map(async (c) => {
      const w = await getMatchWeather(c).catch(() => null);
      return { ...c, weather: w && w.level !== "ok" ? { level: w.level, title: w.title } : null };
    }),
  );
}

export async function listUpcomingMatches(params: {
  comunaId: string;
  type?: MatchType;
  when?: WhenFilter;
  take?: number;
}): Promise<MatchCardData[]> {
  const rows = await db.match.findMany({
    where: {
      comunaId: params.comunaId,
      deletedAt: null,
      status: { in: ["OPEN", "FULL", "CONFIRMED"] },
      startsAt: dateRangeFor(params.when ?? "todos"),
      ...(params.type ? { type: params.type } : {}),
    },
    orderBy: { startsAt: "asc" },
    take: params.take ?? 50,
    select: cardSelect,
  });
  return rows.map(toCard);
}

export function getMatchDetail(id: string) {
  return db.match.findFirst({
    where: { id, deletedAt: null },
    include: {
      venue: true,
      comuna: true,
      organizer: {
        select: { id: true, name: true, profile: { select: { displayName: true, username: true } } },
      },
      goals: { select: { scorerId: true, count: true } },
      resultReports: { orderBy: { createdAt: "desc" }, take: 1, select: { mvpId: true } },
      objections: { select: { userId: true } },
      confirmations: { select: { userId: true } },
      participants: {
        where: { status: { in: ["REGISTERED", "WAITLIST", "ATTENDED", "NO_SHOW"] } },
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: {
                  displayName: true,
                  nickname: true,
                  username: true,
                  rating: true,
                  primaryPosition: true,
                  photoUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export type MatchDetail = NonNullable<Awaited<ReturnType<typeof getMatchDetail>>>;

/** Valoraciones que el usuario ya dio en un partido (para mostrar qué le falta valorar). */
export function listMyReviews(matchId: string, authorId: string) {
  return db.peerReview.findMany({
    where: { matchId, authorId },
    select: { targetId: true, score: true, tags: true },
  });
}
