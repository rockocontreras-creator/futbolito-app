"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { cn } from "@/lib/utils";
import type { NewsSlide } from "@/server/queries/news";

const AUTO_MS = 6000;

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
      className="relative"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocusCapture={() => (paused.current = true)}
      onBlurCapture={() => (paused.current = false)}
    >
      <div
        ref={track}
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto rounded-2xl [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s, i) => (
          <article
            key={s.id}
            aria-roledescription="noticia"
            aria-label={`${i + 1} de ${slides.length}: ${s.kicker}`}
            className="relative w-full shrink-0 snap-center overflow-hidden chalk-pitch text-white"
          >
            <div className="grid min-h-56 gap-4 px-6 py-7 sm:grid-cols-[1fr_auto] sm:items-center sm:px-10">
              <div className="space-y-2">
                <p className="text-sm font-bold text-foco">{s.kicker}</p>
                <h3 className="text-3xl font-display text-balance first-letter:uppercase sm:text-4xl">
                  {s.headline}
                </h3>
                <p className="max-w-md text-white/80">{s.text}</p>
                <Link
                  href={s.href}
                  className="mt-2 inline-flex rounded-full bg-foco px-4 py-2 text-sm font-bold text-[#2a2205] hover:brightness-95 focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:outline-none"
                >
                  {s.cta}
                </Link>
              </div>
              {(s.stat || s.photo) && (
                <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:text-right">
                  {s.photo !== undefined && (
                    <PlayerAvatar
                      name={s.headline}
                      src={s.photo}
                      className="size-16 border-2 border-white/60 text-xl"
                    />
                  )}
                  {s.stat && (
                    <p className="leading-none">
                      <span className="block text-7xl font-score">{s.stat}</span>
                      <span className="text-sm text-white/75">{s.statLabel}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Noticia anterior"
            className="absolute top-1/2 left-2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white hover:bg-black/45 sm:grid"
          >
            <ChevronLeft aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Noticia siguiente"
            className="absolute top-1/2 right-2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white hover:bg-black/45 sm:grid"
          >
            <ChevronRight aria-hidden />
          </button>
          <div className="mt-3 flex justify-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Ir a ${s.kicker}`}
                aria-current={i === index}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-6 bg-primary" : "w-2 bg-muted-foreground/35 hover:bg-muted-foreground/60",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
