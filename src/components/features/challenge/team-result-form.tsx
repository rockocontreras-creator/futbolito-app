"use client";

import { useState } from "react";
import { useServerAction } from "@/components/features/use-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reportTeamResult } from "@/server/actions/challenge";

interface Score {
  home: number;
  away: number;
}

/** El capitán reporta el marcador y quiénes de su equipo jugaron. */
export function TeamResultForm({
  matchId,
  teamId,
  teamName,
  homeName,
  awayName,
  members,
  mine,
  theirs,
  playedIds,
}: {
  matchId: string;
  teamId: string;
  teamName: string;
  homeName: string;
  awayName: string;
  members: { userId: string; name: string }[];
  /** Lo que ya reporté yo (si corrijo). */
  mine: Score | null;
  /** Lo que reportó el otro capitán. */
  theirs: Score | null;
  /** Nómina que ya marqué. */
  playedIds: string[];
}) {
  const start = mine ?? theirs;
  const [home, setHome] = useState(start ? String(start.home) : "");
  const [away, setAway] = useState(start ? String(start.away) : "");
  const [played, setPlayed] = useState<Set<string>>(
    () => new Set(playedIds.length ? playedIds : members.map((m) => m.userId)),
  );
  const { pending, error, run } = useServerAction();
  const matchesTheirs = theirs != null && Number(home) === theirs.home && Number(away) === theirs.away;

  const toggle = (id: string) =>
    setPlayed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form
      className="space-y-5 rounded-2xl border-2 border-foco bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() =>
          reportTeamResult({ matchId, teamId, scoreHome: home, scoreAway: away, playerIds: [...played] }),
        );
      }}
    >
      <div>
        <h2 className="text-xl font-extrabold">{mine ? "Corregir el resultado" : "Reportar el resultado"}</h2>
        <p className="text-[15px] text-muted-foreground">
          {theirs
            ? `El otro capitán reportó ${theirs.home}–${theirs.away}. Si pones lo mismo, queda confirmado; si no, lo resuelve un administrador.`
            : "Cuando el otro capitán reporte el mismo marcador, queda confirmado y se mueve el rango."}
        </p>
      </div>
      <div className="flex items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-extrabold">
          <span className="truncate">{homeName}</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            required
            value={home}
            onChange={(e) => setHome(e.target.value)}
            className="h-16 text-center text-3xl font-score"
          />
        </label>
        <span className="pb-4 text-2xl font-score text-muted-foreground" aria-hidden>
          –
        </span>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-extrabold">
          <span className="truncate">{awayName}</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            required
            value={away}
            onChange={(e) => setAway(e.target.value)}
            className="h-16 text-center text-3xl font-score"
          />
        </label>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-[15px] font-extrabold">Quiénes jugaron de {teamName}</legend>
        <p className="text-sm text-muted-foreground">El resultado mueve el rango solo de los que marques.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.userId}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2.5 has-checked:border-primary has-checked:bg-secondary">
                <input
                  type="checkbox"
                  className="size-5 accent-(--pasto)"
                  checked={played.has(m.userId)}
                  onChange={() => toggle(m.userId)}
                />
                <span className="truncate font-bold">{m.name}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        className="w-full sm:w-auto"
        disabled={pending || home === "" || away === "" || played.size === 0}
      >
        {pending ? "Guardando…" : matchesTheirs ? `Confirmar ${home}–${away}` : "Reportar resultado"}
      </Button>
    </form>
  );
}
