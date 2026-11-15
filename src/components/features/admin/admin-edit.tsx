"use client";

import { Megaphone, Pencil } from "lucide-react";
import { useState } from "react";
import { useServerAction } from "@/components/features/use-action";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { BROADCAST_LINKS } from "@/lib/validations/admin";
import {
  broadcastNotice,
  deleteContentAsAdmin,
  deleteMatchAsAdmin,
  deleteTeamAsAdmin,
  updateMatchAsAdmin,
  updateProfileAsAdmin,
  updateTeamAsAdmin,
} from "@/server/actions/admin";
import { ConfirmButton, ErrorText } from "./admin-actions";

const labelClass = "flex flex-col gap-1 text-sm font-extrabold";

function EditToggle({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <Button type="button" size="sm" variant="outline" aria-expanded={open} onClick={onClick}>
      <Pencil aria-hidden /> {open ? "Cerrar" : label}
    </Button>
  );
}

/** Editar o borrar un partido por jugar. */
export function MatchAdmin({
  matchId,
  startsAtLocal,
  venueId,
  venues,
  maxPlayers,
  minPlayers,
  notes,
  pickup,
  children,
}: {
  matchId: string;
  startsAtLocal: string;
  venueId: string | null;
  venues: { id: string; name: string }[];
  maxPlayers: number | null;
  /** Inscritos actuales: los cupos no pueden bajar de aquí. */
  minPlayers: number;
  notes: string | null;
  pickup: boolean;
  /** Botones que ya existían (anular). */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    startsAtLocal,
    venueId: venueId ?? "",
    maxPlayers: maxPlayers == null ? "" : String(maxPlayers),
    notes: notes ?? "",
  });
  const { pending, error, run } = useServerAction();
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  return (
    <div className="w-full space-y-3 sm:w-auto">
      <div className="flex flex-wrap items-center gap-2">
        <EditToggle open={open} onClick={() => setOpen((o) => !o)} label="Editar" />
        {children}
        <ConfirmButton
          label="Borrar"
          confirmLabel="Sí, borrar el partido"
          pending={pending}
          onConfirm={() => run(() => deleteMatchAsAdmin({ matchId }))}
        />
      </div>
      {open && (
        <form
          className="grid gap-3 rounded-2xl bg-secondary/60 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () =>
                updateMatchAsAdmin({
                  matchId,
                  startsAtLocal: form.startsAtLocal,
                  venueId: form.venueId,
                  maxPlayers: pickup && form.maxPlayers !== "" ? form.maxPlayers : undefined,
                  notes: form.notes,
                }),
              () => setOpen(false),
            );
          }}
        >
          <label className={labelClass}>
            Día y hora
            <Input
              type="datetime-local"
              required
              value={form.startsAtLocal}
              onChange={(e) => set({ startsAtLocal: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            Cancha
            <NativeSelect value={form.venueId} onChange={(e) => set({ venueId: e.target.value })}>
              {!pickup && <option value="">A coordinar</option>}
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </NativeSelect>
          </label>
          {pickup && (
            <label className={labelClass}>
              Cupos (hay {minPlayers} inscritos)
              <Input
                type="number"
                inputMode="numeric"
                min={Math.max(8, minPlayers)}
                max={30}
                value={form.maxPlayers}
                onChange={(e) => set({ maxPlayers: e.target.value })}
              />
            </label>
          )}
          <label className={`${labelClass} sm:col-span-2`}>
            Notas
            <Textarea
              rows={2}
              maxLength={500}
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </label>
          <div className="space-y-2 sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Si cambias el día, la hora o la cancha, se les avisa a los inscritos.
            </p>
          </div>
        </form>
      )}
      <ErrorText text={error} />
    </div>
  );
}

/** Editar o borrar un equipo. */
export function TeamAdmin({
  teamId,
  name,
  description,
}: {
  teamId: string;
  name: string;
  description: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name, description: description ?? "" });
  const { pending, error, run } = useServerAction();
  return (
    <div className="w-full space-y-3 sm:w-auto">
      <div className="flex flex-wrap items-center gap-2">
        <EditToggle open={open} onClick={() => setOpen((o) => !o)} label="Editar" />
        <ConfirmButton
          label="Borrar"
          confirmLabel="Sí, borrar el equipo"
          pending={pending}
          onConfirm={() => run(() => deleteTeamAsAdmin({ teamId }))}
        />
      </div>
      {open && (
        <form
          className="space-y-3 rounded-2xl bg-secondary/60 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => updateTeamAsAdmin({ teamId, ...form }),
              () => setOpen(false),
            );
          }}
        >
          <label className={labelClass}>
            Nombre
            <Input
              required
              maxLength={40}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className={labelClass}>
            Descripción
            <Textarea
              rows={2}
              maxLength={300}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </form>
      )}
      <ErrorText text={error} />
    </div>
  );
}

/** Corregir el nombre o el apodo de un perfil, o quitarle la foto. */
export function ProfileAdmin({
  userId,
  displayName,
  nickname,
  hasPhoto,
}: {
  userId: string;
  displayName: string;
  nickname: string | null;
  hasPhoto: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ displayName, nickname: nickname ?? "", removePhoto: false });
  const { pending, error, run } = useServerAction();
  return (
    <div className="space-y-3 sm:col-span-2">
      <EditToggle open={open} onClick={() => setOpen((o) => !o)} label="Editar perfil" />
      {open && (
        <form
          className="grid gap-3 rounded-2xl bg-secondary/60 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => updateProfileAsAdmin({ userId, ...form }),
              () => {
                setOpen(false);
                setForm((f) => ({ ...f, removePhoto: false }));
              },
            );
          }}
        >
          <label className={labelClass}>
            Nombre
            <Input
              required
              maxLength={60}
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
          </label>
          <label className={labelClass}>
            Apodo
            <Input
              maxLength={30}
              value={form.nickname}
              onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
            />
          </label>
          {hasPhoto && (
            <label className="flex items-center gap-2 text-sm font-extrabold sm:col-span-2">
              <input
                type="checkbox"
                className="size-5 accent-(--pasto)"
                checked={form.removePhoto}
                onChange={(e) => setForm((f) => ({ ...f, removePhoto: e.target.checked }))}
              />
              Quitar la foto de perfil
            </label>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      )}
      <ErrorText text={error} />
    </div>
  );
}

export function DeleteContent({ kind, contentId }: { kind: "comment" | "message"; contentId: string }) {
  const { pending, error, run } = useServerAction();
  return (
    <div className="space-y-1">
      <ConfirmButton
        label="Borrar"
        confirmLabel="Sí, borrar"
        pending={pending}
        onConfirm={() => run(() => deleteContentAsAdmin({ kind, contentId }))}
      />
      <ErrorText text={error} />
    </div>
  );
}

/** Aviso para toda la comuna. Dos pasos: escribir y confirmar a cuántas personas les llega. */
export function BroadcastForm({ people, remaining }: { people: number; remaining: number }) {
  const [form, setForm] = useState({ title: "", body: "", href: "" });
  const [sent, setSent] = useState<number | null>(null);
  const { pending, error, run } = useServerAction();
  const ready = form.title.trim().length >= 4 && remaining > 0 && people > 0;
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <label className={labelClass}>
        Título
        <Input
          maxLength={60}
          placeholder="Ej: Torneo relámpago este sábado"
          value={form.title}
          onChange={(e) => {
            setSent(null);
            setForm((f) => ({ ...f, title: e.target.value }));
          }}
        />
      </label>
      <label className={labelClass}>
        Mensaje (opcional)
        <Textarea
          rows={3}
          maxLength={200}
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
        />
        <span className="font-medium text-muted-foreground">{form.body.length} de 200 letras</span>
      </label>
      <label className={labelClass}>
        Al tocarlo se abre
        <NativeSelect value={form.href} onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))}>
          {Object.entries(BROADCAST_LINKS).map(([href, label]) => (
            <option key={href} value={href}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <ErrorText text={error} />
      {sent != null ? (
        <p className="rounded-2xl bg-primary/12 px-4 py-3 font-extrabold text-primary" aria-live="polite">
          Aviso enviado a {sent} {sent === 1 ? "persona" : "personas"}.
        </p>
      ) : ready ? (
        <ConfirmButton
          label={`Mandar a ${people} ${people === 1 ? "persona" : "personas"}`}
          confirmLabel="Sí, mandar el aviso"
          pending={pending}
          onConfirm={() =>
            run(
              () => broadcastNotice(form),
              (data) => {
                setSent((data as { sent: number }).sent);
                setForm({ title: "", body: "", href: "" });
              },
            )
          }
        />
      ) : (
        <Button type="button" disabled>
          <Megaphone aria-hidden /> Mandar aviso
        </Button>
      )}
    </form>
  );
}
