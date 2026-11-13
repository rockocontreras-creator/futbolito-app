import Link from "next/link";
import { DivisionBadge } from "@/components/features/player/division-badge";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { POSITION_LABEL } from "@/lib/labels";
import { colorName, readableTextOn } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { balanceLabel } from "@/server/services/match-result";
import { averageRating, type RosterPlayer } from "./roster-types";

export const SIDE_NAME = { A: "Equipo A", B: "Equipo B" } as const;

export type TeamColors = { A: string; B: string };
export const DEFAULT_COLORS: TeamColors = { A: "#0e5a36", B: "#ffd23f" };

/** Estilo de la cabecera de un equipo con su color de camiseta. */
export function sideStyle(colors: TeamColors, side: "A" | "B"): React.CSSProperties {
  return { backgroundColor: colors[side], color: readableTextOn(colors[side]) };
}

export function sideTitle(colors: TeamColors, side: "A" | "B", count?: number) {
  return `${SIDE_NAME[side]} · ${colorName(colors[side])}${count != null ? ` (${count})` : ""}`;
}

/** Indicador de nivelación: promedios de cada lado y qué tan parejo quedó. */
export function BalanceMeter({
  a,
  b,
  colors = DEFAULT_COLORS,
}: {
  a: readonly RosterPlayer[];
  b: readonly RosterPlayer[];
  colors?: TeamColors;
}) {
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
            "rounded-full px-2.5 py-0.5 text-xs font-extrabold",
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
        <span style={{ width: `${share}%`, backgroundColor: colors.A }} />
        <span className="w-0.5 bg-card" />
        <span className="flex-1" style={{ backgroundColor: colors.B }} />
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
        <span className="flex items-center gap-1.5 truncate font-bold">
          {p.name}
          {p.isOrganizer && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[12px] font-extrabold">Organiza</span>
          )}
          {mvp && (
            <span className="rounded bg-foco px-1.5 py-0.5 text-[12px] font-extrabold text-[#2a2205]">
              MVP
            </span>
          )}
        </span>
        <span className="text-sm text-muted-foreground">
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
  colors = DEFAULT_COLORS,
}: {
  players: readonly RosterPlayer[];
  goalsOf?: ReadonlyMap<string, number>;
  mvpId?: string | null;
  colors?: TeamColors;
}) {
  const a = players.filter((p) => p.side === "A");
  const b = players.filter((p) => p.side === "B");
  return (
    <div className="space-y-4">
      <BalanceMeter a={a} b={b} colors={colors} />
      <div className="grid gap-3 sm:grid-cols-2">
        {(["A", "B"] as const).map((side) => (
          <div key={side} className="overflow-hidden rounded-lg border">
            <h3 className="px-4 py-2 text-sm font-extrabold" style={sideStyle(colors, side)}>
              {sideTitle(colors, side, side === "A" ? a.length : b.length)}
            </h3>
            <ul className="divide-y-2">
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
