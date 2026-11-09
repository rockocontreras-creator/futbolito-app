import { Shield, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState } from "@/components/features/empty-state";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { listLeagues } from "@/server/queries/leagues";
import { getActiveComuna } from "@/server/queries/zones";

export const metadata: Metadata = { title: "Ligas" };

const SEASON_STATUS = {
  DRAFT: "En preparación",
  REGISTRATION: "Inscripciones abiertas",
  IN_PROGRESS: "En juego",
  FINISHED: "Terminada",
} as const;

export default function LeaguesPage() {
  return (
    <Container className="pt-8">
      <PageHeader
        title="Ligas"
        description="Campeonatos con temporadas, fixture y tabla de posiciones. Los arma un organizador aprobado."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <Suspense fallback={<div className="h-48 animate-pulse rounded-xl border bg-card" aria-hidden />}>
          <LeaguesList />
        </Suspense>
        <aside className="space-y-3 rounded-xl border bg-card p-5">
          <h2 className="text-lg font-bold">¿Quieres organizar una liga?</h2>
          <p className="text-[15px] text-muted-foreground">
            Las ligas las crean organizadores aprobados por el administrador, para que los resultados sean
            confiables. Mientras tanto, arma tu equipo: cuando abra la primera liga podrás inscribirlo.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/equipos">
              <Shield aria-hidden /> Ver equipos
            </Link>
          </Button>
        </aside>
      </div>
    </Container>
  );
}

async function LeaguesList() {
  await connection();
  const comuna = await getActiveComuna();
  const leagues = comuna ? await listLeagues(comuna.id) : [];
  if (leagues.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Aún no hay ligas en San Clemente"
        action={
          <Button asChild>
            <Link href="/equipos/nuevo">Crear mi equipo</Link>
          </Button>
        }
      >
        La primera liga se anuncia aquí. Ten tu equipo listo para inscribirlo.
      </EmptyState>
    );
  }
  return (
    <ul className="space-y-3">
      {leagues.map((l) => {
        const season = l.seasons[0];
        return (
          <li key={l.id} className="flex items-center gap-4 rounded-xl border bg-card p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cancha text-foco">
              <Trophy className="size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block text-lg font-bold">{l.name}</span>
              <span className="block text-sm text-muted-foreground">
                {season
                  ? `${season.name}: ${SEASON_STATUS[season.status]}, ${season._count.teams} equipos`
                  : "Sin temporadas todavía"}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
