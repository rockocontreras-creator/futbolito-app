import "server-only";
import { db } from "@/lib/db";
import { formatMatchDate } from "@/lib/format";
import { getMatchWeather } from "@/server/weather";
import { notifyUsers } from "./notify";

const WINDOW_HOURS = 48;

/**
 * Revisa el clima de los partidos del usuario en las próximas 48 h y deja una notificación por cada partido con
 * mal clima (una sola vez por partido y tipo de alerta). Se llama al mostrar la campana; el clima está cacheado.
 */
export async function ensureWeatherAlerts(userId: string) {
  const now = new Date();
  const until = new Date(now.getTime() + WINDOW_HOURS * 3600_000);
  const matches = await db.match.findMany({
    where: {
      deletedAt: null,
      status: { in: ["OPEN", "FULL", "CONFIRMED"] },
      startsAt: { gte: now, lte: until },
      OR: [
        { organizerId: userId },
        { participants: { some: { userId, status: { in: ["REGISTERED", "WAITLIST"] } } } },
      ],
    },
    select: {
      id: true,
      startsAt: true,
      venue: { select: { name: true, latitude: true, longitude: true } },
      comuna: { select: { latitude: true, longitude: true } },
    },
    take: 10,
  });
  for (const m of matches) {
    const weather = await getMatchWeather({
      startsAt: m.startsAt,
      latitude: m.venue?.latitude ?? m.comuna.latitude,
      longitude: m.venue?.longitude ?? m.comuna.longitude,
    });
    if (weather?.level !== "bad") continue;
    await notifyUsers([userId], {
      type: "WEATHER_ALERT",
      title: `${weather.title} para tu partido del ${formatMatchDate(m.startsAt)}`,
      body: weather.detail,
      href: `/partidos/${m.id}`,
      key: `weather:${m.id}:${weather.title}`,
      renotify: false,
    });
  }
}
