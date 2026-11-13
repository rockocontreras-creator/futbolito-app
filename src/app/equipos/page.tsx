import { Plus, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState } from "@/components/features/empty-state";
import { DivisionBadge } from "@/components/features/player/division-badge";
import { TeamCrest } from "@/components/features/team/team-crest";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { listTeams, type TeamListItem } from "@/server/queries/teams";
import { getActiveComuna } from "@/server/queries/zones";

export const metadata: Metadata = { title: "Equipos" };

export default function TeamsPage() {
  return (
    <Container className="pt-8">
      <PageHeader
        title="Equipos"
        description="Los equipos de San Clemente, ordenados por rango. Pide unirte a uno o arma el tuyo."
        action={
          <Button asChild>
            <Link href="/equipos/nuevo">
              <Plus aria-hidden /> Crear equipo
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<TeamsSkeleton />}>
        <TeamsList />
      </Suspense>
    </Container>
  );
}

async function TeamsList() {
  await connection();
  const comuna = await getActiveComuna();
  const teams = comuna ? await listTeams(comuna.id) : [];
  if (teams.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="Todavía no hay equipos"
        action={
          <Button asChild>
            <Link href="/equipos/nuevo">Crear el primer equipo</Link>
          </Button>
        }
      >
        Crea el tuyo, invita a tu gente y empiecen a sumar rango.
      </EmptyState>
    );
  }
  return (
    <ol className="grid gap-3 md:grid-cols-2">
      {teams.map((t, i) => (
        <li key={t.id}>
          <TeamRow team={t} position={i + 1} />
        </li>
      ))}
    </ol>
  );
}

function TeamRow({ team, position }: { team: TeamListItem; position: number }) {
  const record = `${team.wins}G ${team.draws}E ${team.losses}P`;
  return (
    <Link
      href={`/equipo/${team.slug}`}
      className="flex items-center gap-4 rounded-2xl border-2 bg-card p-4 transition-colors hover:border-primary/40 focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      <span className="w-6 text-center text-lg font-score text-muted-foreground">{position}</span>
      <TeamCrest name={team.name} primary={team.primaryColor} secondary={team.secondaryColor} />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block truncate text-lg font-extrabold">{team.name}</span>
        <span className="block text-sm text-muted-foreground">
          {team._count.members} {team._count.members === 1 ? "jugador" : "jugadores"}
          {team.sector ? `, ${team.sector.name}` : ""}
          {team.matchesPlayed > 0 ? `. ${record}` : ". Sin partidos aún"}
        </span>
      </span>
      <DivisionBadge rating={team.rating} />
    </Link>
  );
}

function TeamsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[84px] animate-pulse rounded-2xl border-2 bg-card" />
      ))}
    </div>
  );
}
