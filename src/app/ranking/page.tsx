import { Medal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/features/empty-state";
import { DivisionBadge } from "@/components/features/player/division-badge";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { TeamCrest } from "@/components/features/team/team-crest";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { Position } from "@/generated/prisma/client";
import { POSITION_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { playerRanking, teamRanking } from "@/server/queries/ranking";
import { getActiveComuna } from "@/server/queries/zones";
import { finalizeDueResults } from "@/server/services/finalize-results";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Clasificación" };

const POSITIONS = Object.keys(POSITION_LABEL) as Position[];

export default function RankingPage({ searchParams }: PageProps<"/ranking">) {
  return (
    <Container className="max-w-4xl pt-8">
      <PageHeader
        title="Clasificación"
        description="Los de mejor rango en San Clemente. Sube jugando: cada resultado confirmado mueve el Elo."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border-2 bg-card" aria-hidden />}>
        <RankingContent searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-xl border-2 px-4 py-2 text-[15px] font-extrabold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

async function RankingContent({ searchParams }: { searchParams: PageProps<"/ranking">["searchParams"] }) {
  const sp = await searchParams;
  const tab = sp.tab === "equipos" ? "equipos" : "jugadores";
  const position = POSITIONS.find((p) => p.toLowerCase() === sp.posicion) ?? undefined;
  const user = await getCurrentUser();
  await finalizeDueResults();
  const comuna = await getActiveComuna(user?.profile?.comunaId);

  return (
    <div className="space-y-5">
      <nav aria-label="Tipo de clasificación" className="flex flex-wrap gap-2">
        <Tab href="/ranking" active={tab === "jugadores"}>
          Jugadores
        </Tab>
        <Tab href="/ranking?tab=equipos" active={tab === "equipos"}>
          Equipos
        </Tab>
      </nav>
      {tab === "jugadores" && (
        <nav aria-label="Filtrar por posición" className="flex flex-wrap gap-1.5">
          <Link
            href="/ranking"
            className={cn(
              "rounded-xl border-2 px-3.5 py-1.5 text-sm font-extrabold",
              !position && "border-primary bg-secondary text-primary",
            )}
          >
            Todas
          </Link>
          {POSITIONS.map((p) => (
            <Link
              key={p}
              href={`/ranking?posicion=${p.toLowerCase()}`}
              className={cn(
                "rounded-xl border-2 px-3.5 py-1.5 text-sm font-extrabold",
                position === p && "border-primary bg-secondary text-primary",
              )}
            >
              {POSITION_LABEL[p]}
            </Link>
          ))}
        </nav>
      )}
      {comuna &&
        (tab === "jugadores" ? (
          <Players comunaId={comuna.id} position={position} meId={user?.id} />
        ) : (
          <Teams comunaId={comuna.id} />
        ))}
    </div>
  );
}

function Rank({ n }: { n: number }) {
  const medal = n === 1 ? "text-[#c9a227]" : n === 2 ? "text-[#9aa3ad]" : n === 3 ? "text-[#b4733a]" : null;
  return (
    <span className="grid w-8 shrink-0 place-items-center text-xl font-score text-muted-foreground">
      {medal ? <Medal className={cn("size-6", medal)} aria-label={`Puesto ${n}`} /> : n}
    </span>
  );
}

async function Players({
  comunaId,
  position,
  meId,
}: {
  comunaId: string;
  position?: Position;
  meId?: string;
}) {
  const rows = await playerRanking(comunaId, position);
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Medal}
        title="Todavía no hay jugadores"
        action={
          <Button asChild>
            <Link href="/perfil">Crear mi perfil</Link>
          </Button>
        }
      >
        Crea tu perfil y juega para aparecer acá.
      </EmptyState>
    );
  }
  return (
    <ol className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
      {rows.map((p, i) => (
        <li key={p.userId} className={cn(p.userId === meId && "bg-foco/12")}>
          <Link
            href={`/jugador/${p.username}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50"
          >
            <Rank n={i + 1} />
            <PlayerAvatar name={p.displayName} src={p.photoUrl} className="size-10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">
                {p.nickname ? `${p.displayName} “${p.nickname}”` : p.displayName}
              </span>
              <span className="block truncate text-sm text-muted-foreground">
                {POSITION_LABEL[p.primaryPosition]} · {p.matchesPlayed} PJ
                <span className="hidden sm:inline">
                  {" "}
                  · {p.wins}G {p.draws}E {p.losses}P
                </span>{" "}
                · {p.goals} {p.goals === 1 ? "gol" : "goles"}
              </span>
            </span>
            <span className="text-right">
              <span className="block text-2xl leading-none font-score">{p.rating}</span>
              <DivisionBadge rating={p.rating} className="mt-1" />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

async function Teams({ comunaId }: { comunaId: string }) {
  const rows = await teamRanking(comunaId);
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Medal}
        title="Todavía no hay equipos"
        action={
          <Button asChild>
            <Link href="/equipos/nuevo">Crear equipo</Link>
          </Button>
        }
      >
        Arma el tuyo y empieza a sumar rango.
      </EmptyState>
    );
  }
  return (
    <ol className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
      {rows.map((t, i) => (
        <li key={t.id}>
          <Link
            href={`/equipo/${t.slug}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50"
          >
            <Rank n={i + 1} />
            <TeamCrest
              name={t.name}
              primary={t.primaryColor}
              secondary={t.secondaryColor}
              className="size-10"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{t.name}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {t._count.members} jugadores · {t.matchesPlayed} PJ · {t.wins}G {t.draws}E {t.losses}P
              </span>
            </span>
            <span className="text-right">
              <span className="block text-2xl leading-none font-score">{t.rating}</span>
              <DivisionBadge rating={t.rating} className="mt-1" />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
