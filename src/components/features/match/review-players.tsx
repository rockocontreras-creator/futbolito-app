"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { useServerAction } from "@/components/features/use-action";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { Button } from "@/components/ui/button";
import { BANTER_TAGS, PLAYER_TAG_LABEL, POSITIVE_TAGS, type PlayerTagId } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { reviewPlayer } from "@/server/actions/match-result";
import type { RosterPlayer } from "./roster-types";

type Given = { targetId: string; score: number; tags: PlayerTagId[] };

/** Después del partido: valorar a compañeros y rivales con estrellas y etiquetas. */
export function ReviewPlayers({
  matchId,
  players,
  given,
}: {
  matchId: string;
  players: RosterPlayer[];
  given: Given[];
}) {
  const givenOf = new Map(given.map((g) => [g.targetId, g]));
  const pendingCount = players.filter((p) => !givenOf.has(p.userId)).length;
  return (
    <section className="space-y-3 rounded-2xl border-2 bg-card p-5" aria-labelledby="valorar">
      <div>
        <h2 id="valorar" className="text-lg font-extrabold">
          Valora a los jugadores
        </h2>
        <p className="text-sm text-muted-foreground">
          {pendingCount > 0
            ? `Te faltan ${pendingCount}. Es anónimo y arma los apodos de cada uno.`
            : "Ya valoraste a todos. Puedes cambiar tus valoraciones durante una semana."}
        </p>
      </div>
      <ul className="space-y-3">
        {players.map((p) => (
          <ReviewRow key={p.userId} matchId={matchId} p={p} given={givenOf.get(p.userId)} />
        ))}
      </ul>
    </section>
  );
}

function ReviewRow({ matchId, p, given }: { matchId: string; p: RosterPlayer; given?: Given }) {
  const [open, setOpen] = useState(!given);
  const [score, setScore] = useState(given?.score ?? 0);
  const [tags, setTags] = useState<PlayerTagId[]>(given?.tags ?? []);
  const [saved, setSaved] = useState(Boolean(given));
  const { pending, error, run } = useServerAction();

  const toggle = (t: PlayerTagId) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : cur.length >= 3 ? cur : [...cur, t]));

  return (
    <li className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <PlayerAvatar name={p.name} src={p.photo} className="size-9 text-sm" />
        <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
        {saved ? (
          <span
            className="flex items-center gap-0.5 text-sm font-extrabold text-primary"
            aria-label={`${score} estrellas`}
          >
            {score}
            <Star className="size-4 fill-current" aria-hidden />
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Sin valorar</span>
        )}
      </button>
      {open && (
        <div className="space-y-3 border-t-2 px-3 py-3">
          <div className="flex gap-1" role="radiogroup" aria-label={`Estrellas para ${p.name}`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={score === n}
                aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
                onClick={() => setScore(n)}
                className="rounded p-0.5 focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none"
              >
                <Star
                  className={cn(
                    "size-8",
                    n <= score ? "fill-foco text-[#b38d00]" : "text-muted-foreground/40",
                  )}
                  aria-hidden
                />
              </button>
            ))}
          </div>
          <TagGroup
            title="Lo mejor (hasta 3 en total)"
            tags={POSITIVE_TAGS}
            selected={tags}
            onToggle={toggle}
          />
          <TagGroup title="Para la talla" tags={BANTER_TAGS} selected={tags} onToggle={toggle} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            size="sm"
            disabled={pending || score === 0}
            onClick={() =>
              run(
                () => reviewPlayer({ matchId, targetId: p.userId, score, tags }),
                () => {
                  setSaved(true);
                  setOpen(false);
                },
              )
            }
          >
            {pending ? "Guardando…" : saved ? "Actualizar" : "Guardar valoración"}
          </Button>
        </div>
      )}
    </li>
  );
}

function TagGroup({
  title,
  tags,
  selected,
  onToggle,
}: {
  title: string;
  tags: PlayerTagId[];
  selected: PlayerTagId[];
  onToggle: (t: PlayerTagId) => void;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-bold text-muted-foreground">{title}</legend>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => {
          const on = selected.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(t)}
              className={cn(
                "rounded-xl border-2 px-3.5 py-1.5 text-sm font-extrabold transition-colors focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none",
                on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary",
              )}
            >
              {PLAYER_TAG_LABEL[t]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
