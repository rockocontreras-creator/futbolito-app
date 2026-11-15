"use client";

import { Check, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useServerAction } from "@/components/features/use-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formationsFor, getFormation, GUEST_NAME_MAX, slotsFor } from "@/lib/formation";
import { cn } from "@/lib/utils";
import { saveLineup } from "@/server/actions/lineup";
import { FormationPitch, type PitchPlayer } from "./formation-pitch";

export interface LineupMember {
  userId: string;
  name: string;
  photo: string | null;
}

type Entry = { userId: string } | { guest: string };

/** El capitán arma su formación: toca un puesto y pone a alguien del plantel o a un invitado sin cuenta. */
export function LineupEditor({
  matchId,
  teamId,
  playersPerSide,
  members,
  initialFormation,
  initialEntries,
}: {
  matchId: string;
  teamId: string;
  playersPerSide: number;
  members: LineupMember[];
  initialFormation: string | null;
  initialEntries: { slot: number; userId?: string; guest?: string }[];
}) {
  const options = formationsFor(playersPerSide);
  const [formationKey, setFormationKey] = useState(getFormation(initialFormation, playersPerSide).key);
  const [entries, setEntries] = useState<Map<number, Entry>>(
    () =>
      new Map(
        initialEntries.flatMap((e): [number, Entry][] =>
          e.userId ? [[e.slot, { userId: e.userId }]] : e.guest ? [[e.slot, { guest: e.guest }]] : [],
        ),
      ),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [guestName, setGuestName] = useState("");
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useServerAction();

  const slots = useMemo(
    () => slotsFor(getFormation(formationKey, playersPerSide)),
    [formationKey, playersPerSide],
  );
  const memberOf = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);
  const players = new Map<number, PitchPlayer>();
  for (const [slot, e] of entries) {
    if ("userId" in e) {
      const m = memberOf.get(e.userId);
      if (m) players.set(slot, { name: m.name, photo: m.photo });
    } else {
      players.set(slot, { name: e.guest, guest: true });
    }
  }
  const placed = new Set([...entries.values()].flatMap((e) => ("userId" in e ? [e.userId] : [])));
  const bench = members.filter((m) => !placed.has(m.userId));
  const guests = [...entries.values()].filter((e) => "guest" in e).length;
  const current = selected != null ? slots.find((s) => s.slot === selected) : undefined;

  function put(slot: number, entry: Entry | null) {
    setSaved(false);
    setEntries((before) => {
      const next = new Map(before);
      if (entry) next.set(slot, entry);
      else next.delete(slot);
      return next;
    });
  }

  function addGuest() {
    const name = guestName.replace(/\s+/g, " ").trim();
    if (selected == null || !name) return;
    put(selected, { guest: name });
    setGuestName("");
    setSelected(null);
  }

  function save() {
    run(
      () =>
        saveLineup({
          matchId,
          teamId,
          formation: formationKey,
          slots: [...entries].map(([slot, e]) => ({ slot, ...e })),
        }),
      () => {
        setSaved(true);
        setSelected(null);
      },
    );
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-extrabold">Formación</legend>
        <div className="flex flex-wrap gap-1.5">
          {options.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={f.key === formationKey}
              onClick={() => {
                setFormationKey(f.key);
                setSaved(false);
              }}
              className={cn(
                "min-h-11 rounded-xl border-2 px-4 text-lg font-score focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none",
                f.key === formationKey
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-secondary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </fieldset>

      <FormationPitch
        slots={slots}
        players={players}
        selected={selected}
        onSlotClick={(slot) => setSelected((cur) => (cur === slot ? null : slot))}
      />

      {current ? (
        <div className="space-y-3 rounded-2xl bg-secondary/60 p-4" aria-live="polite">
          <p className="font-extrabold">
            {current.role}
            {players.get(current.slot) ? `: ${players.get(current.slot)!.name}` : ": puesto vacío"}
          </p>
          {bench.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-bold text-muted-foreground">Del plantel</p>
              <div className="flex flex-wrap gap-1.5">
                {bench.map((m) => (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => {
                      put(current.slot, { userId: m.userId });
                      setSelected(null);
                    }}
                    className="min-h-11 rounded-xl border-2 bg-card px-3.5 text-sm font-extrabold hover:border-primary focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none"
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor={`guest-${teamId}`} className="text-sm font-bold text-muted-foreground">
              Invitado sin cuenta
            </label>
            <div className="flex gap-2">
              <Input
                id={`guest-${teamId}`}
                value={guestName}
                maxLength={GUEST_NAME_MAX}
                placeholder="Nombre o apodo"
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addGuest();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addGuest} disabled={!guestName.trim()}>
                <UserPlus aria-hidden /> Poner
              </Button>
            </div>
          </div>
          {entries.has(current.slot) && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                put(current.slot, null);
                setSelected(null);
              }}
            >
              Vaciar este puesto
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Toca un puesto para poner a alguien del plantel o a un invitado sin cuenta. Los invitados no tienen
          rango ni estadísticas.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Guardar formación"}
        </Button>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {saved ? (
            <span className="inline-flex items-center gap-1 font-extrabold text-primary">
              <Check className="size-4" aria-hidden strokeWidth={3} /> Formación guardada
            </span>
          ) : (
            `${entries.size} de ${slots.length} puestos${guests ? ` · ${guests} ${guests === 1 ? "invitado" : "invitados"}` : ""}`
          )}
        </p>
      </div>
    </div>
  );
}
