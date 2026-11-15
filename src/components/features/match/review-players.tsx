"use client";

import { Flame, HeartHandshake, Megaphone } from "lucide-react";
import { useState, useTransition } from "react";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { COMMENDATIONS, type CommendationId } from "@/lib/commendations";
import { cn } from "@/lib/utils";
import { commendPlayer } from "@/server/actions/match-result";
import type { RosterPlayer } from "./roster-types";

type Given = { targetId: string; commends: CommendationId[] };

const ICON: Record<CommendationId, typeof Flame> = {
  COMPANERO: HeartHandshake,
  LIDER: Megaphone,
  CRACK: Flame,
};

/** Después del partido: recomendar a quienes jugaron (como en Counter-Strike). Se guarda al tocar. */
export function CommendPlayers({
  matchId,
  players,
  given,
}: {
  matchId: string;
  players: RosterPlayer[];
  given: Given[];
}) {
  const givenOf = new Map(given.map((g) => [g.targetId, g.commends]));
  return (
    <section className="space-y-3 rounded-2xl border-2 bg-card p-5" aria-labelledby="recomendar">
      <div>
        <h2 id="recomendar" className="text-lg font-extrabold">
          Recomienda a los que jugaron
        </h2>
        <p className="text-sm text-muted-foreground">
          Toca lo que se ganó cada uno. Es anónimo, suma en su perfil y puedes cambiarlo durante una semana.
        </p>
      </div>
      <ul className="divide-y-2">
        {players.map((p) => (
          <CommendRow key={p.userId} matchId={matchId} p={p} initial={givenOf.get(p.userId) ?? []} />
        ))}
      </ul>
    </section>
  );
}

function CommendRow({
  matchId,
  p,
  initial,
}: {
  matchId: string;
  p: RosterPlayer;
  initial: CommendationId[];
}) {
  const [selected, setSelected] = useState<CommendationId[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: CommendationId) {
    const before = selected;
    const next = before.includes(id) ? before.filter((x) => x !== id) : [...before, id];
    setSelected(next);
    setError(null);
    startTransition(async () => {
      const res = await commendPlayer({ matchId, targetId: p.userId, commends: next });
      if (!res.ok) {
        setSelected(before);
        setError(res.error);
      }
    });
  }

  return (
    <li className="space-y-2 py-3 first:pt-0 last:pb-0">
      <p className="flex items-center gap-3">
        <PlayerAvatar name={p.name} src={p.photo} className="size-9 text-sm" />
        <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
      </p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Recomendar a ${p.name}`}>
        {COMMENDATIONS.map((c) => {
          const Icon = ICON[c.id];
          const on = selected.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              title={c.help}
              disabled={pending}
              onClick={() => toggle(c.id)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 px-3.5 py-1.5 text-sm font-extrabold transition-colors focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-70",
                on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary",
              )}
            >
              <Icon className="size-4" aria-hidden /> {c.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}
