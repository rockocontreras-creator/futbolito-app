import {
  CalendarPlus,
  ChevronRight,
  MapPin,
  Medal,
  Search,
  Shuffle,
  UserPlus,
  UserSearch,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState } from "@/components/features/empty-state";
import { MatchCard, MatchCardSkeleton } from "@/components/features/match/match-card";
import { DivisionShield } from "@/components/features/player/division-badge";
import { Mascot } from "@/components/layout/brand";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { DIVISIONS } from "@/lib/rating/divisions";
import { listUpcomingMatches, withWeather } from "@/server/queries/matches";
import { getNewsSlides } from "@/server/queries/news";
import { NewsCarousel } from "@/components/features/news-carousel";
import { getActiveComuna } from "@/server/queries/zones";

const steps = [
  {
    icon: CalendarPlus,
    title: "Publica o busca",
    text: "Elige cancha, hora y formato. En un minuto tu revoltijo está a la vista de todos los de la comuna.",
  },
  {
    icon: UserPlus,
    title: "Se van sumando",
    text: "Cada jugador toma un cupo. Si se llena, queda en lista de espera y sube solo si alguien se baja.",
  },
  {
    icon: Shuffle,
    title: "Equipos parejos",
    text: "Con un botón se arman los equipos según el rango de cada uno, arqueros repartidos primero.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b-2 bg-secondary/70">
        <Container className="grid gap-8 py-8 md:grid-cols-[1.05fr_1fr] md:items-center md:gap-12 md:py-16">
          <div className="space-y-5">
            <Mascot className="size-20 md:size-24" />
            <h1 className="text-[2.6rem] font-display sm:text-6xl lg:text-[4.25rem]">
              ¿Te sumas a la <span className="text-primary">pichanga</span>?
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Revoltijos, desafíos y ranking para los que juegan futbolito en San Clemente.
            </p>
            <div className="flex flex-wrap gap-3 pb-1">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/partidos">
                  <Search aria-hidden /> Buscar pichanga
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="/publicar">Publicar revoltijo</Link>
              </Button>
            </div>
          </div>
          <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-primary/20" aria-hidden />}>
            <News />
          </Suspense>
        </Container>
      </section>

      <Container className="space-y-16 pt-12">
        <section aria-labelledby="semana" className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <h2 id="semana" className="text-3xl font-display sm:text-4xl">
              Esta semana
            </h2>
            <Link
              href="/partidos?cuando=semana"
              className="shrink-0 text-[15px] font-extrabold text-primary hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <Suspense
            fallback={
              <div className="grid gap-4 md:grid-cols-2">
                <MatchCardSkeleton />
                <MatchCardSkeleton />
              </div>
            }
          >
            <WeekMatches />
          </Suspense>
        </section>

        <section aria-labelledby="atajos" className="space-y-4">
          <h2 id="atajos" className="sr-only">
            Atajos
          </h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {shortcuts.map(({ href, icon: Icon, title, text }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full items-center gap-4 rounded-2xl border-2 bg-card p-4 relieve transition-[transform,box-shadow,background-color] duration-100 hover:bg-secondary/60 focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none active:translate-y-1 active:shadow-none"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-6" aria-hidden strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-extrabold">{title}</span>
                    <span className="text-sm text-muted-foreground">{text}</span>
                  </span>
                  <ChevronRight
                    className="size-5 shrink-0 text-muted-foreground"
                    aria-hidden
                    strokeWidth={2.6}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="como" className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3">
            <h2 id="como" className="text-3xl font-display sm:text-4xl">
              Cómo funciona un revoltijo
            </h2>
            <p className="max-w-md text-muted-foreground">
              Para cuando no tienes con quién jugar o te faltan dos para completar. Sin grupos de WhatsApp
              eternos.
            </p>
          </div>
          <ol className="space-y-5">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="grid grid-cols-[44px_1fr] gap-4">
                <span className="relative grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="size-5" aria-hidden />
                  <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-foco text-[12px] font-score text-[#2a2205]">
                    {i + 1}
                  </span>
                </span>
                <div>
                  <h3 className="text-lg font-extrabold">{title}</h3>
                  <p className="text-[15px] text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="rango" className="rounded-2xl border-2 bg-card p-6 md:p-8">
          <div className="grid gap-8 md:grid-cols-[1fr_1.4fr] md:items-center">
            <div className="space-y-2">
              <h2 id="rango" className="text-3xl font-display sm:text-4xl">
                Tu rango se gana en la cancha
              </h2>
              <p className="text-muted-foreground">
                Cada resultado confirmado mueve tu rango. Ganarle a uno mejor suma más; golear también cuenta.
              </p>
            </div>
            <ol className="grid grid-cols-5 items-end gap-2" aria-label="Divisiones, de menor a mayor">
              {[...DIVISIONS].reverse().map((d, i) => (
                <li key={d.id} className="flex flex-col items-center gap-2 text-center">
                  <DivisionShield
                    rating={d.min === Number.NEGATIVE_INFINITY ? 0 : d.min}
                    className={sizes[i]}
                  />
                  <span className="text-sm font-extrabold">{d.label}</span>
                  <span className="text-xs font-score text-muted-foreground">
                    {d.min === Number.NEGATIVE_INFINITY ? "< 900" : `${d.min}+`}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <p className="flex justify-center gap-5 text-sm text-muted-foreground lg:hidden">
          <Link href="/privacidad" className="underline underline-offset-4 hover:text-foreground">
            Privacidad
          </Link>
          <Link href="/terminos" className="underline underline-offset-4 hover:text-foreground">
            Términos de uso
          </Link>
        </p>
      </Container>
    </>
  );
}

const shortcuts = [
  {
    href: "/se-busca",
    icon: UserSearch,
    title: "¿Te falta uno?",
    text: "Publica cuántos faltan y la gente se ofrece",
  },
  { href: "/canchas", icon: MapPin, title: "Canchas", text: "Mapa de dónde se juega y cómo llegar" },
  { href: "/ranking", icon: Medal, title: "Clasificación", text: "Los de mejor rango de la comuna" },
] as const;

const sizes = ["size-8", "size-9", "size-10", "size-11", "size-12"];

async function WeekMatches() {
  await connection();
  const comuna = await getActiveComuna();
  const matches = comuna
    ? await withWeather(await listUpcomingMatches({ comunaId: comuna.id, when: "semana", take: 4 }))
    : [];
  if (matches.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="Sin partidos esta semana"
        action={
          <Button asChild variant="outline">
            <Link href="/publicar">Publicar revoltijo</Link>
          </Button>
        }
      >
        Los partidos que se publiquen para los próximos 7 días aparecen aquí.
      </EmptyState>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {matches.map((m) => (
        <MatchCard key={m.id} match={m} />
      ))}
    </div>
  );
}

async function News() {
  await connection();
  const comuna = await getActiveComuna();
  const slides = comuna ? await getNewsSlides(comuna.id) : [];
  if (slides.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl border border-white/15 bg-black/20 p-7">
        <CalendarPlus className="size-10 text-foco" aria-hidden />
        <h2 className="text-3xl font-display">Todavía no hay partidos</h2>
        <p className="text-white/80">
          Arma el primer revoltijo de San Clemente y comparte el link por WhatsApp.
        </p>
        <Button asChild variant="foco">
          <Link href="/publicar">Publicar el primero</Link>
        </Button>
      </div>
    );
  }
  return <NewsCarousel slides={slides} />;
}
