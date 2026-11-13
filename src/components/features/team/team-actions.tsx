"use client";

import { Check, Clock, LogIn, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { answerJoinRequest, leaveTeam, makeCaptain, requestToJoin } from "@/server/actions/team";

export type TeamViewer =
  | { kind: "anonymous" }
  | { kind: "no-profile" }
  | { kind: "member"; captain: boolean }
  | { kind: "requested" }
  | { kind: "can-request" };

type Result = { ok: true; data: unknown } | { ok: false; error: string };

function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<Result>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
    });
  };
  return { pending, error, run };
}

/** Botón principal en la página del equipo. */
export function TeamMembership({
  teamId,
  slug,
  viewer,
}: {
  teamId: string;
  slug: string;
  viewer: TeamViewer;
}) {
  const { pending, error, run } = useAction();
  const here = `/equipo/${slug}`;

  let body: React.ReactNode;
  switch (viewer.kind) {
    case "anonymous":
      body = (
        <Button asChild size="lg" className="w-full">
          <Link href={`/ingresar?callbackUrl=${encodeURIComponent(here)}`}>
            <LogIn aria-hidden /> Ingresa para unirte
          </Link>
        </Button>
      );
      break;
    case "no-profile":
      body = (
        <Button asChild size="lg" className="w-full">
          <Link href={`/perfil?volver=${encodeURIComponent(here)}`}>
            <UserRound aria-hidden /> Crea tu perfil para unirte
          </Link>
        </Button>
      );
      break;
    case "requested":
      body = (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-secondary py-3 text-sm font-extrabold">
          <Clock className="size-4 text-primary" aria-hidden /> Solicitud enviada al capitán
        </p>
      );
      break;
    case "can-request":
      body = (
        <Button
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => run(() => requestToJoin({ teamId }))}
        >
          {pending ? "Enviando…" : "Pedir unirme"}
        </Button>
      );
      break;
    case "member":
      body = (
        <div className="space-y-2">
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-secondary py-3 text-sm font-extrabold">
            <Check className="size-4 text-primary" aria-hidden />
            {viewer.captain ? "Eres capitán de este equipo" : "Juegas en este equipo"}
          </p>
          <Button
            variant="ghost"
            className="w-full text-destructive hover:bg-destructive/8"
            disabled={pending}
            onClick={() => {
              if (window.confirm("¿Seguro que quieres salir del equipo?")) run(() => leaveTeam({ teamId }));
            }}
          >
            Salir del equipo
          </Button>
        </div>
      );
      break;
  }

  return (
    <div className="space-y-2">
      {body}
      {error && (
        <p role="alert" className="text-center text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Aceptar o rechazar una solicitud (solo capitanes). */
export function RequestAnswer({ requestId }: { requestId: string }) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(() => answerJoinRequest({ requestId, accept: true }))}
        >
          <Check aria-hidden /> Aceptar
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          aria-label="Rechazar solicitud"
          onClick={() => run(() => answerJoinRequest({ requestId, accept: false }))}
        >
          <X aria-hidden />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Nombrar capitán a un jugador (solo capitanes). */
export function MakeCaptainButton({ teamId, userId }: { teamId: string; userId: string }) {
  const { pending, error, run } = useAction();
  return (
    <span className="flex flex-col items-end">
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => run(() => makeCaptain({ teamId, userId }))}
      >
        Hacer capitán
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
