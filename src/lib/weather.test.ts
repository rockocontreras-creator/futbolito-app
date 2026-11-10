import { describe, expect, it } from "vitest";
import { classifyWeather, pickHour, type HourWeather, type HourlyForecast } from "./weather";

const w = (o: Partial<HourWeather>): HourWeather => ({
  temp: 18,
  rainProbability: 0,
  precipitation: 0,
  code: 0,
  wind: 10,
  gusts: 15,
  ...o,
});

describe("classifyWeather", () => {
  it("buen tiempo sin alerta", () => {
    expect(classifyWeather(w({})).level).toBe("ok");
  });
  it("lluvia probable es alerta", () => {
    const v = classifyWeather(w({ rainProbability: 70 }));
    expect(v.level).toBe("bad");
    expect(v.title).toBe("Va a llover");
  });
  it("lluvia posible es aviso", () => {
    expect(classifyWeather(w({ rainProbability: 40 })).title).toBe("Puede llover");
  });
  it("tormenta tiene prioridad", () => {
    expect(classifyWeather(w({ code: 95, rainProbability: 90, gusts: 80 })).title).toBe("Tormenta eléctrica");
  });
  it("lluvia fuerte por milímetros", () => {
    expect(classifyWeather(w({ precipitation: 4 })).title).toBe("Lluvia fuerte");
  });
  it("viento y temperaturas extremas", () => {
    expect(classifyWeather(w({ gusts: 65 })).level).toBe("bad");
    expect(classifyWeather(w({ gusts: 50 })).title).toBe("Viento fuerte");
    expect(classifyWeather(w({ temp: 1 })).title).toBe("Mucho frío");
    expect(classifyWeather(w({ temp: 34 })).title).toBe("Mucho calor");
  });
});

describe("pickHour", () => {
  const f: HourlyForecast = {
    time: ["2026-11-14T19:00", "2026-11-14T20:00"],
    temperature_2m: [20, 18],
    precipitation_probability: [10, 80],
    precipitation: [0, 1.2],
    weather_code: [1, 61],
    wind_speed_10m: [8, 12],
    wind_gusts_10m: [15, 25],
  };
  it("toma la hora del partido", () => {
    expect(pickHour(f, "2026-11-14T20:00")).toMatchObject({ temp: 18, rainProbability: 80, code: 61 });
  });
  it("devuelve null si la hora no está en el pronóstico", () => {
    expect(pickHour(f, "2026-11-30T20:00")).toBeNull();
  });
});
