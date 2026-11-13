"use client";

import { ArrowDownToLine, ArrowUpToLine, MoreVertical, Shuffle, UserX, Undo2 } from "lucide-react";
import { useState } from "react";
import { useServerAction } from "@/components/features/use-action";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  clearTeams,
  drawTeams,
  kickParticipant,
  moveParticipantList,
  setParticipantSide,
} from "@/server/actions/match-admin";
import type { RosterPlayer } from "./roster-types";
import { BalanceMeter, DEFAULT_COLORS, PlayerLine, sideTitle, type TeamColors } from "./teams-view";

/** Panel del organizador: armar equipos parejos, mover, subir/bajar de la espera y expulsar. */
export function ManageRoster({
  matchId,
  players,
  colors = DEFAULT_COLORS,
}: {
  matchId: string;
  players: RosterPlayer[];
  colors?: TeamColors;
}) {
  const { pending, error, run } = useServerAction();
  const registered = players.filter((p) => p.status === "REGISTERED");
  const waitlist = players.filter((p) => p.status === "WAITLIST");
  const a = registered.filter((p) => p.side === "A");
  const b = registered.filter((p) => p.side === "B");
  const unassigned = registered.filter((p) => p.side == null);
  const hasTeams = a.length + b.length > 0;

  return (
    <section
      className="space-y-4 rounded-xl border-2 border-primary/30 bg-card p-5"
      aria-labelledby="gestion"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="gestion" className="text-lg font-extrabold">
            Tu partido
          </h2>
          <p className="text-sm text-muted-foreground">
            Arma equipos parejos por rango y ajusta a mano. Toca ⋮ en un jugador para moverlo o sacarlo.
          </p>
        </div>
        <div className="flex gap-2">
          {hasTeams && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => run(() => clearTeams({ matchId }))}
            >
              <Undo2 aria-hidden /> Deshacer
            </Button>
          )}
          <Button
            size="sm"
            disabled={pending || registered.length < 2}
            onClick={() => run(() => drawTeams({ matchId }))}
          >
            <Shuffle aria-hidden /> {hasTeams ? "Volver a nivelar" : "Armar equipos parejos"}
          </Button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/8 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}

      {hasTeams && <BalanceMeter a={a} b={b} colors={colors} />}

      <div className={cn("grid gap-6", hasTeams && "sm:grid-cols-2 sm:gap-x-8")}>
        {hasTeams &&
          (["A", "B"] as const).map((side) => {
            const list = side === "A" ? a : b;
            return (
              <Group
                key={side}
                title={sideTitle(colors, side, list.length)}
                tone={side}
                colors={colors}
                players={list}
                matchId={matchId}
                run={run}
                pending={pending}
              />
            );
          })}
        {unassigned.length > 0 && (
          <Group
            title={hasTeams ? `Sin equipo (${unassigned.length})` : `Inscritos (${unassigned.length})`}
            players={unassigned}
            matchId={matchId}
            run={run}
            pending={pending}
          />
        )}
        {waitlist.length > 0 && (
          <Group
            title={`Lista de espera (${waitlist.length})`}
            players={waitlist}
            matchId={matchId}
            run={run}
            pending={pending}
          />
        )}
      </div>
    </section>
  );
}

type Run = ReturnType<typeof useServerAction>["run"];

function Group({
  title,
  tone,
  colors = DEFAULT_COLORS,
  players,
  matchId,
  run,
  pending,
}: {
  title: string;
  tone?: "A" | "B";
  colors?: TeamColors;
  players: RosterPlayer[];
  matchId: string;
  run: Run;
  pending: boolean;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 border-b-2 pb-2 text-sm font-extrabold">
        {tone && (
          <span
            className="size-3.5 rounded-full ring-1 ring-black/15"
            style={{ backgroundColor: colors[tone] }}
            aria-hidden
          />
        )}
        {title}
      </h3>
      <ul className="divide-y-2">
        {players.map((p) => (
          <PlayerLine
            key={p.userId}
            p={p}
            trailing={<PlayerMenu p={p} matchId={matchId} run={run} pending={pending} />}
          />
        ))}
      </ul>
    </div>
  );
}

function PlayerMenu({
  p,
  matchId,
  run,
  pending,
}: {
  p: RosterPlayer;
  matchId: string;
  run: Run;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const act = (fn: Parameters<Run>[0]) => {
    setOpen(false);
    run(fn);
  };
  const userId = p.userId;
  const items: { label: string; icon?: React.ReactNode; danger?: boolean; onClick: () => void }[] = [];
  if (p.status === "REGISTERED") {
    if (p.side !== "A")
      items.push({
        label: "Pasar al equipo A",
        onClick: () => act(() => setParticipantSide({ matchId, userId, side: "A" })),
      });
    if (p.side !== "B")
      items.push({
        label: "Pasar al equipo B",
        onClick: () => act(() => setParticipantSide({ matchId, userId, side: "B" })),
      });
    if (p.side)
      items.push({
        label: "Dejar sin equipo",
        onClick: () => act(() => setParticipantSide({ matchId, userId, side: null })),
      });
    if (!p.isOrganizer)
      items.push({
        label: "Mover a la espera",
        icon: <ArrowDownToLine className="size-4" aria-hidden />,
        onClick: () => act(() => moveParticipantList({ matchId, userId, list: "WAITLIST" })),
      });
  } else {
    items.push({
      label: "Subir a inscritos",
      icon: <ArrowUpToLine className="size-4" aria-hidden />,
      onClick: () => act(() => moveParticipantList({ matchId, userId, list: "REGISTERED" })),
    });
  }
  if (!p.isOrganizer)
    items.push({
      label: "Expulsar del partido",
      icon: <UserX className="size-4" aria-hidden />,
      danger: true,
      onClick: () => {
        if (window.confirm(`¿Expulsar a ${p.name}? No podrá volver a inscribirse en este partido.`)) {
          act(() => kickParticipant({ matchId, userId }));
        } else setOpen(false);
      },
    });

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Opciones para ${p.name}`}
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreVertical aria-hidden />
      </Button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <ul
            role="menu"
            className="absolute right-0 z-40 mt-1 w-52 overflow-hidden rounded-lg border bg-popover py-1 shadow-lg"
          >
            {items.map((it) => (
              <li key={it.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={it.onClick}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none",
                    it.danger && "text-destructive",
                  )}
                >
                  {it.icon}
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
