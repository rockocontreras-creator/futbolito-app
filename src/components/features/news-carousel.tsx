"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Medal,
  Search,
  Shield,
  Swords,
  Trophy,
  Goal,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { cn } from "@/lib/utils";
import type { NewsSlide } from "@/server/queries/news";

const AUTO_MS = 6000;

const ICONS: Record<NewsSlide["icon"], LucideIcon> = {
  swords: Swords,
  calendar: CalendarDays,
  trophy: Trophy,
  medal: Medal,
  score: Goal,
  search: Search,
  shield: Shield,
};

/** Carrusel de noticias: deslizable, con flechas y puntos; avanza solo salvo que el usuario prefiera menos movimiento. */
export function NewsCarousel({ slides }: { slides: NewsSlide[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  const go = useCallback(
    (i: number) => {
      const el = track.current;
      if (!el || slides.length === 0) return;
      const next = (i + slides.length) % slides.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    },
    [slides.length],
  );

  // Índice actual según el desplazamiento (sirve también al deslizar con el dedo).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (!paused.current && document.visibilityState === "visible") go(index + 1);
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [go, index, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Noticias de la comuna"
      className="relative min-w-0"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocusCapture={() => (paused.current = true)}
      onBlurCapture={() => (paused.current = false)}
    >
      <div
        ref={track}
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto rounded-3xl chalk-pitch relieve [--relieve-color:var(--cancha-oscura)] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s, i) => {
          const Icon = ICONS[s.icon];
          return (
            <article
              key={s.id}
              aria-roledescription="noticia"
              aria-label={`${i + 1} de ${slides.length}: ${s.topic}`}
              className="flex w-full shrink-0 snap-center flex-col gap-5 p-6 text-white sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                {s.photo !== undefined ? (
                  <PlayerAvatar
                    name={s.headline}
                    src={s.photo}
                    className="size-16 border-[3px] border-foco text-xl"
                  />
                ) : (
                  <span className="grid size-14 place-items-center rounded-2xl bg-foco text-accent-foreground">
                    <Icon className="size-7" aria-hidden strokeWidth={2.4} />
                  </span>
                )}
                {s.stat && (
                  <p className="text-right leading-none">
                    <span className="block text-6xl font-score text-foco tabular-nums">{s.stat}</span>
                    <span className="text-sm font-bold text-white/85">{s.statLabel}</span>
                  </p>
                )}
              </div>
              <div className="mt-auto space-y-2">
                <h3 className="text-[1.6rem] font-display first-letter:uppercase">{s.headline}</h3>
                <p className="text-base text-white/90">{s.text}</p>
              </div>
              <Link
                href={s.href}
                className="inline-flex h-11 w-fit items-center gap-1 rounded-2xl bg-foco px-5 text-[15px] font-extrabold text-accent-foreground relieve transition-[transform,box-shadow] duration-100 [--relieve-color:var(--foco-canto)] focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:outline-none active:translate-y-1 active:shadow-none"
              >
                {s.cta} <ChevronRight className="size-4" aria-hidden />
              </Link>
            </article>
          );
        })}
      </div>

      {slides.length > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Ver: ${s.topic}`}
                aria-current={i === index}
                className="grid h-6 place-items-center"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-all duration-300",
                    i === index ? "w-7 bg-primary" : "w-2 bg-input hover:bg-muted-foreground/60",
                  )}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Noticia anterior"
              className="grid size-10 place-items-center rounded-xl border-2 bg-card text-foreground relieve-sm hover:bg-secondary focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none active:translate-y-0.5 active:shadow-none"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Noticia siguiente"
              className="grid size-10 place-items-center rounded-xl border-2 bg-card text-foreground relieve-sm hover:bg-secondary focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none active:translate-y-0.5 active:shadow-none"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
