"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useServerAction } from "@/components/features/use-action";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reportResult } from "@/server/actions/match-result";
import type { RosterPlayer } from "./roster-types";
import { DEFAULT_COLORS, SIDE_NAME, sideStyle, type TeamColors } from "./teams-view";

/** El organizador reporta marcador, goleadores, MVP y quién no llegó. */
export function ReportResultForm({
  matchId,
  players,
  initial,
  colors = DEFAULT_COLORS,
}: {
  matchId: string;
  players: RosterPlayer[];
  colors?: TeamColors;
  initial?: {
    scoreA: number;
    scoreB: number;
    goals: Record<string, number>;
    mvpId: string | null;
    noShow: string[];
  };
}) {
  const { pending, error, run } = useServerAction();
  const [scoreA, setScoreA] = useState(initial?.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(initial?.scoreB ?? 0);
  const [goals, setGoals] = useState<Record<string, number>>(initial?.goals ?? {});
  const [mvpId, setMvpId] = useState<string>(initial?.mvpId ?? "");
  const [noShow, setNoShow] = useState<Set<string>>(new Set(initial?.noShow ?? []));
  const [done, setDone] = useState(false);

  const bump = (id: string, d: number) =>
    setGoals((g) => {
      const next = Math.max(0, (g[id] ?? 0) + d);
      const copy = { ...g };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  const toggleNoShow = (id: string) =>
    setNoShow((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else {
        n.add(id);
        setGoals((g) => {
          const copy = { ...g };
          delete copy[id];
          return copy;
        });
        if (mvpId === id) setMvpId("");
      }
      return n;
    });

  const submit = () =>
    run(
      () =>
        reportResult({
          matchId,
          scoreA,
          scoreB,
          goals: Object.entries(goals).map(([userId, count]) => ({ userId, count })),
          mvpId: mvpId || null,
          noShowIds: [...noShow],
        }),
      () => setDone(true),
    );

  const played = players.filter((p) => !noShow.has(p.userId));

  return (
    <section className="space-y-5 rounded-xl border-2 border-foco bg-card p-5" aria-labelledby="reportar">
      <div>
        <h2 id="reportar" className="text-lg font-extrabold">
          {initial ? "Corregir resultado" : "¿Cómo salió?"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Cuenta cuando lo confirme la mayoría de los que jugaron (tú ya cuentas). Ahí se actualizan el rango
          y las estadísticas.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <ScoreInput label={SIDE_NAME.A} value={scoreA} onChange={setScoreA} tone="A" color={colors.A} />
        <span className="text-3xl font-score text-muted-foreground">–</span>
        <ScoreInput label={SIDE_NAME.B} value={scoreB} onChange={setScoreB} tone="B" color={colors.B} />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold">Goles y asistencia</legend>
        <ul className="divide-y-2 rounded-lg border">
          {players.map((p) => {
            const absent = noShow.has(p.userId);
            return (
              <li key={p.userId} className={cn("flex items-center gap-3 px-3 py-2", absent && "opacity-60")}>
                <span
                  className="grid size-6 shrink-0 place-items-center rounded border border-black/10 text-[12px] font-extrabold"
                  style={p.side ? sideStyle(colors, p.side) : undefined}
                  aria-label={p.side ? SIDE_NAME[p.side] : "Sin equipo"}
                >
                  {p.side ?? "?"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.name}</span>
                {!p.isOrganizer && (
                  <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={absent}
                      onChange={() => toggleNoShow(p.userId)}
                      className="size-4 accent-[var(--destructive)]"
                    />
                    No llegó
                  </label>
                )}
                <span className="flex items-center gap-1" aria-label={`Goles de ${p.name}`}>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={absent || !goals[p.userId]}
                    onClick={() => bump(p.userId, -1)}
                    aria-label={`Quitar gol a ${p.name}`}
                  >
                    <Minus aria-hidden />
                  </Button>
                  <span className="w-6 text-center text-lg font-score">{goals[p.userId] ?? 0}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={absent}
                    onClick={() => bump(p.userId, 1)}
                    aria-label={`Sumar gol a ${p.name}`}
                  >
                    <Plus aria-hidden />
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <label className="block space-y-1.5">
        <span className="text-sm font-bold">Figura del partido (MVP)</span>
        <select
          value={mvpId}
          onChange={(e) => setMvpId(e.target.value)}
          className="h-11 w-full rounded-lg border bg-background px-3 text-[15px]"
        >
          <option value="">Sin MVP</option>
          {played.map((p) => (
            <option key={p.userId} value={p.userId}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/8 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}
      {done && !error && (
        <p role="status" className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
          Resultado guardado. Les llegó un aviso para que lo confirmen.
        </p>
      )}
      <Button size="lg" className="w-full" disabled={pending} onClick={submit}>
        {pending ? "Guardando…" : initial ? "Guardar corrección" : "Reportar resultado"}
      </Button>
    </section>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
  tone,
  color,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  tone: "A" | "B";
  color: string;
}) {
  const id = `score-${tone}`;
  return (
    <div className="space-y-1 text-center">
      <label htmlFor={id} className="text-sm font-extrabold">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={99}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(99, Number(e.target.value) || 0)))}
        style={{ borderColor: color }}
        className={cn(
          "h-16 w-full rounded-xl border-2 text-center text-4xl font-score focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none",
        )}
      />
    </div>
  );
}
