import { Clock3, MapPin, Plus, UserSearch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/features/empty-state";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { Position } from "@/generated/prisma/client";
import { formatMatchDate } from "@/lib/format";
import { POSITION_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { listOpenRequests, type RequestListItem } from "@/server/queries/requests";
import { getActiveComuna } from "@/server/queries/zones";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Se busca" };
const POSITIONS = Object.keys(POSITION_LABEL) as Position[];

export default function RequestsPage({ searchParams }: PageProps<"/se-busca">) {
  return (
    <Container className="pt-8">
      <PageHeader
        title="Se busca"
        description="¿Les falta uno? ¿Necesitan arquero? Publica cuántos faltan y la gente se ofrece."
        action={
          <Button asChild>
            <Link href="/se-busca/nuevo">
              <Plus aria-hidden /> Buscar jugadores
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border-2 bg-card" aria-hidden />}>
        <RequestsList searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function RequestsList({ searchParams }: { searchParams: PageProps<"/se-busca">["searchParams"] }) {
  const sp = await searchParams;
  const position = POSITIONS.find((p) => p.toLowerCase() === sp.posicion);
  const user = await getCurrentUser();
  const comuna = await getActiveComuna(user?.profile?.comunaId);
  const rows = comuna ? await listOpenRequests(comuna.id, position) : [];

  return (
    <div className="space-y-5">
      <nav aria-label="Filtrar por posición" className="flex flex-wrap gap-1.5">
        <span className="mr-1 self-center text-sm text-muted-foreground">Juego de:</span>
        <Link
          href="/se-busca"
          className={cn(
            "rounded-xl border-2 px-3.5 py-1.5 text-sm font-extrabold",
            !position && "border-primary bg-secondary text-primary",
          )}
        >
          Lo que sea
        </Link>
        {POSITIONS.map((p) => (
          <Link
            key={p}
            href={`/se-busca?posicion=${p.toLowerCase()}`}
            className={cn(
              "rounded-xl border-2 px-3.5 py-1.5 text-sm font-extrabold",
              position === p && "border-primary bg-secondary text-primary",
            )}
          >
            {POSITION_LABEL[p]}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState
          icon={UserSearch}
          title={
            position
              ? `Nadie busca ${POSITION_LABEL[position].toLowerCase()} ahora`
              : "Nadie está buscando jugadores ahora"
          }
          action={
            <Button asChild>
              <Link href="/se-busca/nuevo">Publicar que me faltan</Link>
            </Button>
          }
        >
          Si a tu partido le falta gente, publícalo acá y te llegan ofertas.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <li key={r.id}>
              <RequestCard r={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestCard({ r }: { r: RequestListItem }) {
  const missing = r.playersNeeded - r._count.responses;
  const author = r.author.profile?.displayName ?? r.author.name ?? "Jugador";
  return (
    <Link
      href={`/se-busca/${r.id}`}
      className="flex h-full gap-4 rounded-2xl border-2 bg-card p-5 transition-colors hover:border-primary/40 focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      <span className="grid w-20 shrink-0 place-items-center rounded-lg bg-cancha py-3 text-center text-white">
        <span className="text-5xl leading-none font-score">{missing}</span>
        <span className="text-[13px] font-bold text-white/80">{missing === 1 ? "falta" : "faltan"}</span>
      </span>
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="block text-lg font-extrabold">
          {r.positions.length ? r.positions.map((p) => POSITION_LABEL[p]).join(", ") : "Cualquier posición"}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-bold first-letter:uppercase">
          <Clock3 className="size-4 text-primary" aria-hidden /> {formatMatchDate(r.startsAt)}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden /> {r.venue?.name ?? "Cancha a coordinar"}
        </span>
        <span className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
          <PlayerAvatar name={author} src={r.author.profile?.photoUrl} className="size-6 text-[10px]" /> Busca{" "}
          {author}
        </span>
      </span>
    </Link>
  );
}
