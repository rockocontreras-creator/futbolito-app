import { CloudLightning, CloudRain, Sun, Thermometer, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchWeather } from "@/server/weather";

function WeatherIcon({ title }: { title: string }) {
  const cls = "size-7 shrink-0";
  if (/tormenta/i.test(title)) return <CloudLightning className={cls} aria-hidden />;
  if (/lluv|llov|nieve/i.test(title)) return <CloudRain className={cls} aria-hidden />;
  if (/viento/i.test(title)) return <Wind className={cls} aria-hidden />;
  if (/frío|calor/i.test(title)) return <Thermometer className={cls} aria-hidden />;
  return <Sun className={cls} aria-hidden />;
}

/** Pronóstico a la hora del partido. Si hay mal clima se muestra como alerta. */
export function WeatherBanner({ weather }: { weather: MatchWeather }) {
  const meta = [
    weather.temp != null ? `${Math.round(weather.temp)} °C` : null,
    weather.rainProbability != null ? `${weather.rainProbability}% lluvia` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <section
      role={weather.level === "bad" ? "alert" : undefined}
      aria-label="Pronóstico del tiempo"
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3",
        weather.level === "bad" &&
          "border-[#93c5fd] bg-[#dbeafe] text-[#1e3a8a] dark:bg-[#1e3a8a]/40 dark:text-[#dbeafe]",
        weather.level === "watch" && "border-foco/60 bg-foco/20 text-[#4a3c00] dark:text-foco",
        weather.level === "ok" && "bg-card",
      )}
    >
      <WeatherIcon title={weather.title} />
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">{weather.title}</p>
        <p className="text-sm opacity-90">
          {weather.level === "ok" ? meta : weather.detail}
          {weather.level !== "ok" && meta ? ` (${meta})` : ""}
        </p>
      </div>
      <span className="hidden text-[12px] opacity-70 sm:block">Open-Meteo</span>
    </section>
  );
}
