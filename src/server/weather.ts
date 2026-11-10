import "server-only";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { cacheLife } from "next/cache";
import { TIMEZONE } from "@/config/site";
import { DEFAULT_CENTER } from "@/lib/maps";
import { classifyWeather, pickHour, type HourlyForecast, type WeatherVerdict } from "@/lib/weather";

// Pronóstico de Open-Meteo (gratis, sin clave, uso no comercial). Se cachea una hora por ubicación.
const FORECAST_DAYS = 16;

async function fetchForecast(lat: number, lng: number): Promise<HourlyForecast | null> {
  "use cache";
  cacheLife("hours");
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toFixed(2));
  url.searchParams.set("longitude", lng.toFixed(2));
  url.searchParams.set(
    "hourly",
    "temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m",
  );
  url.searchParams.set("timezone", TIMEZONE);
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { hourly?: HourlyForecast };
    return json.hourly ?? null;
  } catch {
    return null;
  }
}

export interface MatchWeather extends WeatherVerdict {
  temp: number | null;
  rainProbability: number | null;
}

/** Clima a la hora del partido (null si es muy lejano, ya pasó o el servicio no responde). */
export async function getMatchWeather(m: {
  startsAt: Date;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<MatchWeather | null> {
  const ms = m.startsAt.getTime() - Date.now();
  if (ms < -2 * 3600_000 || ms > (FORECAST_DAYS - 1) * 86400_000) return null;
  const lat = m.latitude ?? DEFAULT_CENTER.lat;
  const lng = m.longitude ?? DEFAULT_CENTER.lng;
  const forecast = await fetchForecast(Math.round(lat * 100) / 100, Math.round(lng * 100) / 100);
  if (!forecast) return null;
  const hour = format(new TZDate(m.startsAt, TIMEZONE), "yyyy-MM-dd'T'HH:00");
  const w = pickHour(forecast, hour);
  if (!w) return null;
  return { ...classifyWeather(w), temp: w.temp, rainProbability: w.rainProbability };
}
