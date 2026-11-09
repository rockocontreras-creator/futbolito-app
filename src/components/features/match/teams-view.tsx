import Link from "next/link";
import { DivisionBadge } from "@/components/features/player/division-badge";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { POSITION_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { balanceLabel } from "@/server/services/match-result";
import { averageRating, type RosterPlayer } from "./roster-types";

export const SIDE_NAME = { A: "Equipo A", B: "Equipo B" } as const;

/** Indicador de nivelación: promedios de cada lado y qué tan parejo quedó. */
export function BalanceMeter({ a, b }: { a: readonly RosterPlayer[]; b: readonly RosterPlayer[] }) {
  const avgA = averageRating(a);
  const avgB = averageRating(b);
  if (avgA == null || avgB == null) return null;
  const { diff, label, level } = balanceLabel(avgA, avgB);
  const share = Math.round((avgA / (avgA + avgB)) * 100);
  return (
    <div className="space-y-2" aria-label={`Nivelación: ${label}, diferencia de ${diff} puntos`}>
      <div className="flex items-baseline justify-between text-sm">
        <span>
          <span className="text-xl font-score">{avgA}</span>{" "}
          <span className="text-muted-foreground">promedio A</span>
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-bold",
            level === "ok" && "bg-primary/12 text-primary",
            level === "warn" && "bg-foco/30 text-[#5a4500] dark:text-foco",
            level === "bad" && "bg-destructive/12 text-destructive",
          )}
        >
          {label} · {diff} pts
        </span>
        <span>
          <span className="text-muted-foreground">promedio B</span>{" "}
          <span className="text-xl font-score">{avgB}</span>
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
        <span className="bg-cancha" style={{ width: `${share}%` }} />
        <span className="w-0.5 bg-card" />
        <span className="flex-1 bg-foco" />
      </div>
    </div>
  );
}

export function PlayerLine({
  p,
  goals,
  mvp,
  trailing,
}: {
  p: RosterPlayer;
  goals?: number;
  mvp?: boolean;
  trailing?: React.ReactNode;
}) {
  const body = (
    <>
      <PlayerAvatar name={p.name} src={p.photo} className="size-9 text-sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate font-semibold">
          {p.name}
          {p.isOrganizer && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-bold">Organiza</span>
          )}
          {mvp && (
            <span className="rounded bg-foco px-1.5 py-0.5 text-[11px] font-bold text-[#2a2205]">MVP</span>
          )}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {p.position ? POSITION_LABEL[p.position] : "Sin perfil"}
          {goals ? ` · ${goals} ${goals === 1 ? "gol" : "goles"}` : ""}
          {p.status === "NO_SHOW" ? " · No llegó" : ""}
        </span>
      </span>
    </>
  );
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      {p.username ? (
        <Link
          href={`/jugador/${p.username}`}
          className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
        >
          {body}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{body}</span>
      )}
      {trailing ?? (p.rating != null && <DivisionBadge rating={p.rating} />)}
    </li>
  );
}

/** Los dos equipos lado a lado (solo lectura). */
export function TeamsView({
  players,
  goalsOf,
  mvpId,
}: {
  players: readonly RosterPlayer[];
  goalsOf?: ReadonlyMap<string, number>;
  mvpId?: string | null;
}) {
  const a = players.filter((p) => p.side === "A");
  const b = players.filter((p) => p.side === "B");
  return (
    <div className="space-y-4">
      <BalanceMeter a={a} b={b} />
      <div className="grid gap-3 sm:grid-cols-2">
        {(["A", "B"] as const).map((side) => (
          <div key={side} className="overflow-hidden rounded-lg border">
            <h3
              className={cn(
                "px-4 py-2 text-sm font-bold",
                side === "A" ? "bg-cancha text-white" : "bg-foco text-[#2a2205]",
              )}
            >
              {SIDE_NAME[side]} ({side === "A" ? a.length : b.length})
            </h3>
            <ul className="divide-y">
              {(side === "A" ? a : b).map((p) => (
                <PlayerLine key={p.userId} p={p} goals={goalsOf?.get(p.userId)} mvp={mvpId === p.userId} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
