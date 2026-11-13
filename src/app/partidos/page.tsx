import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState } from "@/components/features/empty-state";
import { MatchCard, MatchCardSkeleton } from "@/components/features/match/match-card";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { MatchType } from "@/generated/prisma/client";
import type { WhenFilter } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { listUpcomingMatches, withWeather } from "@/server/queries/matches";
import { getActiveComuna } from "@/server/queries/zones";

export const metadata: Metadata = { title: "Partidos" };

const TYPES = [
  { value: "todos", label: "Todos" },
  { value: "revoltijo", label: "Revoltijos" },
  { value: "desafio", label: "Desafíos" },
  { value: "liga", label: "Liga" },
] as const;

const TYPE_FILTER: Record<(typeof TYPES)[number]["value"], MatchType | undefined> = {
  todos: undefined,
  revoltijo: "PICKUP",
  desafio: "CHALLENGE",
  liga: "LEAGUE",
};

const WHEN = [
  { value: "todos", label: "Cualquier día" },
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Próximos 7 días" },
] as const;

type Filters = { tipo: (typeof TYPES)[number]["value"]; cuando: WhenFilter };

function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const tipo = TYPES.find((t) => t.value === sp.tipo)?.value ?? "todos";
  const cuando = WHEN.find((w) => w.value === sp.cuando)?.value ?? "todos";
  return { tipo, cuando };
}

function hrefFor(f: Filters) {
  const params = new URLSearchParams();
  if (f.tipo !== "todos") params.set("tipo", f.tipo);
  if (f.cuando !== "todos") params.set("cuando", f.cuando);
  const q = params.toString();
  return q ? `/partidos?${q}` : "/partidos";
}

export default function MatchesPage({ searchParams }: PageProps<"/partidos">) {
  return (
    <Container className="pt-8">
      <PageHeader
        title="Partidos"
        description="Revoltijos y partidos por jugar en San Clemente. Tócalo para ver quién va y sumarte."
        action={
          <Button asChild>
            <Link href="/publicar">
              <Plus aria-hidden /> Publicar revoltijo
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <FilteredList searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      scroll={false}
      className={cn(
        "rounded-xl border-2 px-3.5 py-1.5 text-sm font-extrabold whitespace-nowrap transition-colors",
        active
          ? "border-primary bg-secondary text-primary"
          : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

async function FilteredList({ searchParams }: { searchParams: PageProps<"/partidos">["searchParams"] }) {
  const filters = parseFilters(await searchParams);
  await connection();
  const comuna = await getActiveComuna();
  const type = TYPE_FILTER[filters.tipo];
  const matches = comuna
    ? await withWeather(await listUpcomingMatches({ comunaId: comuna.id, type, when: filters.cuando }))
    : [];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Tipo de partido">
          {TYPES.map((t) => (
            <Chip
              key={t.value}
              href={hrefFor({ ...filters, tipo: t.value })}
              active={filters.tipo === t.value}
            >
              {t.label}
            </Chip>
          ))}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Fecha">
          {WHEN.map((w) => (
            <Chip
              key={w.value}
              href={hrefFor({ ...filters, cuando: w.value })}
              active={filters.cuando === w.value}
            >
              {w.label}
            </Chip>
          ))}
        </div>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No hay partidos con estos filtros"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/publicar">Publicar revoltijo</Link>
              </Button>
              {(filters.tipo !== "todos" || filters.cuando !== "todos") && (
                <Button asChild variant="outline">
                  <Link href="/partidos">Quitar filtros</Link>
                </Button>
              )}
            </div>
          }
        >
          Prueba con otra fecha o publica tú el partido: el resto se suma desde aquí o por WhatsApp.
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {matches.length === 1 ? "1 partido" : `${matches.length} partidos`}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <MatchCardSkeleton />
      <MatchCardSkeleton />
      <MatchCardSkeleton />
    </div>
  );
}
