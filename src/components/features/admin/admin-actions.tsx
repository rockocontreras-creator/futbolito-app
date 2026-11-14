"use client";

import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { useServerAction } from "@/components/features/use-action";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { ROLE_LABEL, type UserRole } from "@/lib/admin";
import {
  cancelMatchAsAdmin,
  createSector,
  resolveResult,
  reviewVenue,
  setUserRole,
  setUserSuspended,
  updateSector,
} from "@/server/actions/admin";

function ErrorText({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" className="text-sm font-bold text-destructive">
      {text}
    </p>
  );
}

/** Botón de dos pasos para acciones que no se deshacen: el primer toque pregunta, el segundo actúa. */
function ConfirmButton({
  label,
  confirmLabel,
  pending,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setAsking(false)}>
        No
      </Button>
    </span>
  );
}

export function VenueReview({
  venueId,
  status,
}: {
  venueId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}) {
  const { pending, error, run } = useServerAction();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status !== "APPROVED" && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => reviewVenue({ venueId, status: "APPROVED" }))}
          >
            <Check aria-hidden /> Aprobar
          </Button>
        )}
        {status !== "REJECTED" && (
          <ConfirmButton
            label={status === "APPROVED" ? "Quitar del mapa" : "Rechazar"}
            confirmLabel={status === "APPROVED" ? "Sí, quitarla" : "Sí, rechazar"}
            pending={pending}
            onConfirm={() => run(() => reviewVenue({ venueId, status: "REJECTED" }))}
          />
        )}
      </div>
      <ErrorText text={error} />
    </div>
  );
}

export function ResolveResult({
  matchId,
  scoreA,
  scoreB,
}: {
  matchId: string;
  scoreA: number;
  scoreB: number;
}) {
  const [a, setA] = useState(String(scoreA));
  const [b, setB] = useState(String(scoreB));
  const { pending, error, run } = useServerAction();
  const changed = Number(a) !== scoreA || Number(b) !== scoreB;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => resolveResult({ matchId, scoreA: a, scoreB: b }));
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-extrabold">
          Equipo A
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={60}
            value={a}
            onChange={(e) => setA(e.target.value)}
            className="w-20 text-center text-xl font-score"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-extrabold">
          Equipo B
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={60}
            value={b}
            onChange={(e) => setB(e.target.value)}
            className="w-20 text-center text-xl font-score"
          />
        </label>
        <Button type="submit" disabled={pending || a === "" || b === ""}>
          {pending ? "Guardando…" : "Confirmar resultado"}
        </Button>
        <ConfirmButton
          label="Anular partido"
          confirmLabel="Sí, anular"
          pending={pending}
          onConfirm={() => run(() => cancelMatchAsAdmin({ matchId }))}
        />
      </div>
      {changed && (
        <p className="text-sm text-muted-foreground">
          Cambiaste el marcador: los goleadores que reportó el organizador se borran.
        </p>
      )}
      <ErrorText text={error} />
    </form>
  );
}

export function CancelMatch({ matchId }: { matchId: string }) {
  const { pending, error, run } = useServerAction();
  return (
    <div className="space-y-1">
      <ConfirmButton
        label="Anular"
        confirmLabel="Sí, anular"
        pending={pending}
        onConfirm={() => run(() => cancelMatchAsAdmin({ matchId }))}
      />
      <ErrorText text={error} />
    </div>
  );
}

export function UserActions({
  userId,
  role,
  suspended,
  lockedReason,
}: {
  userId: string;
  role: UserRole;
  suspended: boolean;
  /** Si viene, la cuenta no se puede cambiar desde el panel (uno mismo o admin fijo). */
  lockedReason: string | null;
}) {
  const { pending, error, run } = useServerAction();
  if (lockedReason) return <p className="text-sm text-muted-foreground">{lockedReason}</p>;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`rol-${userId}`}>
          Rol
        </label>
        <NativeSelect
          id={`rol-${userId}`}
          value={role}
          disabled={pending}
          onChange={(e) => run(() => setUserRole({ userId, role: e.target.value }))}
          className="h-9 w-40 text-sm"
        >
          {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </NativeSelect>
        {suspended ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => setUserSuspended({ userId, suspended: false }))}
          >
            Reactivar
          </Button>
        ) : (
          role !== "ADMIN" && (
            <ConfirmButton
              label="Suspender"
              confirmLabel="Sí, suspender"
              pending={pending}
              onConfirm={() => run(() => setUserSuspended({ userId, suspended: true }))}
            />
          )
        )}
      </div>
      <ErrorText text={error} />
    </div>
  );
}

export function SectorCreate() {
  const [name, setName] = useState("");
  const { pending, error, run } = useServerAction();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => createSector({ name }),
          () => setName(""),
        );
      }}
    >
      <label htmlFor="sector-nuevo" className="text-[15px] font-extrabold">
        Agregar sector
      </label>
      <div className="flex gap-2">
        <Input
          id="sector-nuevo"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Villa Esperanza, Flor del Llano"
        />
        <Button type="submit" disabled={pending || name.trim().length < 2} className="h-12">
          <Plus aria-hidden /> Agregar
        </Button>
      </div>
      <ErrorText text={error} />
    </form>
  );
}

export function SectorRow({
  sectorId,
  name,
  isActive,
  players,
  venues,
}: {
  sectorId: string;
  name: string;
  isActive: boolean;
  players: number;
  venues: number;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const { pending, error, run } = useServerAction();
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {editing ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => updateSector({ sectorId, name: value }),
                () => setEditing(false),
              );
            }}
          >
            <Input
              aria-label="Nombre del sector"
              value={value}
              maxLength={60}
              onChange={(e) => setValue(e.target.value)}
              className="h-10"
            />
            <Button type="submit" size="sm" disabled={pending || value.trim().length < 2} className="h-10">
              Guardar
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Cancelar"
              className="size-10"
              onClick={() => {
                setValue(name);
                setEditing(false);
              }}
            >
              <X aria-hidden />
            </Button>
          </form>
        ) : (
          <>
            <p className="min-w-0 flex-1">
              <span className="font-extrabold">{name}</span>{" "}
              {!isActive && (
                <span className="rounded-lg bg-muted px-2 py-0.5 text-sm font-bold text-muted-foreground">
                  Oculto
                </span>
              )}
              <span className="block text-sm text-muted-foreground">
                {players} {players === 1 ? "jugador" : "jugadores"} · {venues}{" "}
                {venues === 1 ? "cancha" : "canchas"}
              </span>
            </p>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing(true)}>
              Renombrar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => updateSector({ sectorId, isActive: !isActive }))}
            >
              {isActive ? "Ocultar" : "Mostrar"}
            </Button>
          </>
        )}
      </div>
      <ErrorText text={error} />
    </li>
  );
}
