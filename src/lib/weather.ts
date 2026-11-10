// Pronóstico para la hora del partido y decisión de alerta. Funciones puras (los datos vienen de Open-Meteo).

export interface HourlyForecast {
  time: string[]; // hora local de Chile, "2026-11-14T20:00"
  temperature_2m: (number | null)[];
  precipitation_probability: (number | null)[];
  precipitation: (number | null)[];
  weather_code: (number | null)[];
  wind_speed_10m: (number | null)[];
  wind_gusts_10m: (number | null)[];
}

export interface HourWeather {
  temp: number | null;
  rainProbability: number | null;
  precipitation: number | null;
  code: number | null;
  wind: number | null;
  gusts: number | null;
}

export type WeatherLevel = "ok" | "watch" | "bad";

export interface WeatherVerdict {
  level: WeatherLevel;
  title: string;
  detail: string;
}

/** Busca la hora local "AAAA-MM-DDTHH:00" del partido en la serie horaria. */
export function pickHour(forecast: HourlyForecast, localHour: string): HourWeather | null {
  const i = forecast.time.indexOf(localHour);
  if (i === -1) return null;
  return {
    temp: forecast.temperature_2m[i] ?? null,
    rainProbability: forecast.precipitation_probability[i] ?? null,
    precipitation: forecast.precipitation[i] ?? null,
    code: forecast.weather_code[i] ?? null,
    wind: forecast.wind_speed_10m[i] ?? null,
    gusts: forecast.wind_gusts_10m[i] ?? null,
  };
}

const inRange = (c: number | null, from: number, to: number) => c != null && c >= from && c <= to;

/**
 * Decide si hay que avisar. Prioridad: tormenta > nieve > lluvia fuerte > lluvia > viento > frío/calor.
 * Códigos WMO: 51–67 llovizna/lluvia, 71–77 y 85–86 nieve, 80–82 chubascos, 95–99 tormenta.
 */
export function classifyWeather(w: HourWeather): WeatherVerdict {
  const p = w.rainProbability ?? 0;
  const mm = w.precipitation ?? 0;
  const g = w.gusts ?? w.wind ?? 0;
  const t = w.temp;

  if (inRange(w.code, 95, 99)) {
    return { level: "bad", title: "Tormenta eléctrica", detail: "Se pronostican rayos. Mejor reprogramar." };
  }
  if (inRange(w.code, 71, 77) || inRange(w.code, 85, 86)) {
    return { level: "bad", title: "Nieve", detail: "Se pronostica nieve a la hora del partido." };
  }
  if (mm >= 2.5 || w.code === 65 || w.code === 82) {
    return {
      level: "bad",
      title: "Lluvia fuerte",
      detail: `${mm.toFixed(1)} mm a la hora del partido. Revisen si la cancha aguanta.`,
    };
  }
  if (p >= 60 || mm >= 0.5 || inRange(w.code, 61, 67) || inRange(w.code, 80, 81)) {
    return {
      level: "bad",
      title: "Va a llover",
      detail: `${p}% de probabilidad de lluvia a la hora del partido.`,
    };
  }
  if (g >= 60) {
    return { level: "bad", title: "Viento muy fuerte", detail: `Ráfagas de ${Math.round(g)} km/h.` };
  }
  if (p >= 35 || inRange(w.code, 51, 57)) {
    return {
      level: "watch",
      title: "Puede llover",
      detail: `${p}% de probabilidad de lluvia. Lleven algo para cubrirse.`,
    };
  }
  if (g >= 45) {
    return { level: "watch", title: "Viento fuerte", detail: `Ráfagas de ${Math.round(g)} km/h.` };
  }
  if (t != null && t <= 2) {
    return {
      level: "watch",
      title: "Mucho frío",
      detail: `${Math.round(t)} °C. Abríguense para el calentamiento.`,
    };
  }
  if (t != null && t >= 32) {
    return { level: "watch", title: "Mucho calor", detail: `${Math.round(t)} °C. Lleven harta agua.` };
  }
  return {
    level: "ok",
    title: "Buen tiempo para jugar",
    detail: t != null ? `${Math.round(t)} °C, ${p}% de lluvia.` : "Sin alertas.",
  };
}
