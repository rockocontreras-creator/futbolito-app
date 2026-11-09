"use client";

import { Check, Clock, LogIn, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { joinMatch, leaveMatch } from "@/server/actions/match";

export type ViewerState =
  | { kind: "anonymous" }
  | { kind: "no-profile" }
  | { kind: "organizer" }
  | { kind: "registered" }
  | { kind: "waitlist"; position: number }
  | { kind: "can-join"; full: boolean }
  | { kind: "closed"; reason: string };

/** Botón principal del partido: sumarse, bajarse o el paso previo que falte. */
export function RosterActions({ matchId, viewer }: { matchId: string; viewer: ViewerState }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const here = `/partidos/${matchId}`;

  type Action = (input: {
    matchId: string;
  }) => Promise<{ ok: true; data: object } | { ok: false; error: string }>;

  function run(action: Action, okText: (status?: string) => string) {
    setMessage(null);
    startTransition(async () => {
      const res = await action({ matchId });
      if (res.ok) {
        const status = "status" in res.data ? String(res.data.status) : undefined;
        setMessage({ tone: "ok", text: okText(status) });
      } else {
        setMessage({ tone: "error", text: res.error });
      }
    });
  }

  let body: React.ReactNode;
  switch (viewer.kind) {
    case "anonymous":
      body = (
        <Button asChild size="lg" className="w-full">
          <Link href={`/ingresar?callbackUrl=${encodeURIComponent(here)}`}>
            <LogIn aria-hidden /> Ingresa para sumarte
          </Link>
        </Button>
      );
      break;
    case "no-profile":
      body = (
        <Button asChild size="lg" className="w-full">
          <Link href={`/perfil?volver=${encodeURIComponent(here)}`}>
            <UserRound aria-hidden /> Crea tu perfil para sumarte
          </Link>
        </Button>
      );
      break;
    case "organizer":
      body = (
        <p className="flex items-center justify-center gap-2 rounded-full bg-secondary py-3 text-sm font-bold">
          <Check className="size-4 text-primary" aria-hidden /> Organizas este partido
        </p>
      );
      break;
    case "registered":
      body = (
        <div className="space-y-2">
          <p className="flex items-center justify-center gap-2 rounded-full bg-primary/12 py-3 text-sm font-bold text-primary">
            <Check className="size-4" aria-hidden /> Estás dentro
          </p>
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive"
            disabled={pending}
            onClick={() => run(leaveMatch, () => "Te bajaste del partido.")}
          >
            Bajarme del partido
          </Button>
        </div>
      );
      break;
    case "waitlist":
      body = (
        <div className="space-y-2">
          <p className="flex items-center justify-center gap-2 rounded-full bg-foco/30 py-3 text-sm font-bold">
            <Clock className="size-4" aria-hidden /> En lista de espera, puesto {viewer.position}
          </p>
          <Button
            variant="ghost"
            className="w-full"
            disabled={pending}
            onClick={() => run(leaveMatch, () => "Saliste de la lista de espera.")}
          >
            Salir de la lista de espera
          </Button>
        </div>
      );
      break;
    case "can-join":
      body = (
        <Button
          size="lg"
          variant={viewer.full ? "outline" : "default"}
          className="w-full"
          disabled={pending}
          onClick={() =>
            run(joinMatch, (s) =>
              s === "WAITLIST" ? "Quedaste en la lista de espera." : "¡Listo, estás dentro!",
            )
          }
        >
          {pending ? "Guardando…" : viewer.full ? "Anotarme en la lista de espera" : "Sumarme"}
        </Button>
      );
      break;
    case "closed":
      body = (
        <p className="rounded-full bg-secondary py-3 text-center text-sm font-bold text-muted-foreground">
          {viewer.reason}
        </p>
      );
      break;
  }

  return (
    <div className="space-y-2">
      {body}
      <p
        aria-live="polite"
        className={
          message?.tone === "error"
            ? "text-center text-sm font-medium text-destructive"
            : "text-center text-sm font-medium text-primary"
        }
      >
        {message?.text}
      </p>
    </div>
  );
}
