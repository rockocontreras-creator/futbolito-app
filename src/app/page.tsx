import { CalendarPlus, Search, Shuffle, UserPlus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState } from "@/components/features/empty-state";
import { MatchCard, MatchCardSkeleton } from "@/components/features/match/match-card";
import { DivisionShield } from "@/components/features/player/division-badge";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { DIVISIONS } from "@/lib/rating/divisions";
import { listUpcomingMatches } from "@/server/queries/matches";
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
      <section className="relative overflow-hidden chalk-pitch text-white">
        <Container className="grid gap-10 py-12 md:grid-cols-[1.15fr_1fr] md:items-center md:py-20">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">
              <span className="size-2 rounded-full bg-foco" aria-hidden />
              San Clemente, Región del Maule
            </p>
            <h1 className="text-[3.6rem] font-display text-balance sm:text-7xl lg:text-[5.5rem]">
              ¿Te sumas a la pichanga?
            </h1>
            <p className="max-w-md text-lg text-white/80">
              Encuentra revoltijos cerca de ti, completa equipos y sube de división jugando.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="foco" size="lg">
                <Link href="/partidos">
                  <Search aria-hidden /> Buscar pichanga
                </Link>
              </Button>
              <Button asChild variant="onDark" size="lg">
                <Link href="/publicar">Publicar revoltijo</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl bg-cal/95 p-4 text-foreground shadow-[0_24px_60px_-24px_rgb(0_0_0/0.55)] dark:bg-card">
            <p className="px-1 pb-3 text-sm font-bold text-cancha dark:text-white">El próximo partido</p>
            <Suspense fallback={<MatchCardSkeleton />}>
              <NextMatch />
            </Suspense>
          </div>
        </Container>
      </section>

      <Container className="space-y-16 pt-12">
        <section aria-labelledby="semana" className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <h2 id="semana" className="text-4xl font-display text-cancha dark:text-white">
              Esta semana
            </h2>
            <Link href="/partidos?cuando=semana" className="text-sm font-bold text-primary hover:underline">
              Ver todos los partidos
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

        <section aria-labelledby="como" className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3">
            <h2 id="como" className="text-4xl font-display text-cancha dark:text-white">
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
                <span className="relative grid size-11 place-items-center rounded-full bg-cancha text-white">
                  <Icon className="size-5" aria-hidden />
                  <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-foco text-[11px] font-score text-[#2a2205]">
                    {i + 1}
                  </span>
                </span>
                <div>
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="text-[15px] text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="rango" className="rounded-2xl border bg-card p-6 md:p-8">
          <div className="grid gap-8 md:grid-cols-[1fr_1.4fr] md:items-center">
            <div className="space-y-2">
              <h2 id="rango" className="text-4xl font-display text-cancha dark:text-white">
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
                  <span className="text-[13px] font-bold">{d.label}</span>
                  <span className="text-xs font-score text-muted-foreground">
                    {d.min === Number.NEGATIVE_INFINITY ? "< 900" : `${d.min}+`}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </Container>
    </>
  );
}

const sizes = ["size-8", "size-9", "size-10", "size-11", "size-12"];

async function NextMatch() {
  await connection();
  const comuna = await getActiveComuna();
  const [next] = comuna ? await listUpcomingMatches({ comunaId: comuna.id, take: 1 }) : [];
  if (!next) {
    return (
      <EmptyState
        icon={CalendarPlus}
        title="Todavía no hay partidos"
        className="border-solid bg-card py-8"
        action={
          <Button asChild>
            <Link href="/publicar">Publicar el primero</Link>
          </Button>
        }
      >
        Arma el primer revoltijo de San Clemente y comparte el link por WhatsApp.
      </EmptyState>
    );
  }
  return <MatchCard match={next} />;
}

async function WeekMatches() {
  await connection();
  const comuna = await getActiveComuna();
  const matches = comuna ? await listUpcomingMatches({ comunaId: comuna.id, when: "semana", take: 4 }) : [];
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
