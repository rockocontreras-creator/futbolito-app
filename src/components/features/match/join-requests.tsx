"use client";

import { Check, Lock, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { DivisionBadge } from "@/components/features/player/division-badge";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { Button } from "@/components/ui/button";
import { answerJoinRequest } from "@/server/actions/match";

export interface JoinRequestItem {
  id: string;
  name: string;
  username: string | null;
  photo: string | null;
  rating: number | null;
  position: string | null;
}

/** Solicitudes para entrar a un partido privado: quien organiza acepta o rechaza. */
export function JoinRequests({ requests, full }: { requests: JoinRequestItem[]; full: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function answer(requestId: string, accept: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await answerJoinRequest({ requestId, accept });
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <section className="rounded-2xl border-2 border-foco bg-card" aria-labelledby="solicitudes">
      <h2 id="solicitudes" className="flex items-center gap-2 border-b-2 px-5 py-4 text-lg font-extrabold">
        <Lock className="size-5 text-primary" aria-hidden /> Quieren entrar ({requests.length})
      </h2>
      {full && (
        <p className="border-b-2 bg-secondary/50 px-5 py-2.5 text-sm text-muted-foreground">
          El partido está lleno: a quien aceptes queda en la lista de espera.
        </p>
      )}
      <ul className="divide-y-2">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <PlayerAvatar name={r.name} src={r.photo} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">
                {r.username ? (
                  <Link href={`/jugador/${r.username}`} className="hover:underline">
                    {r.name}
                  </Link>
                ) : (
                  r.name
                )}
              </p>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                {r.position}
                {r.rating != null && <DivisionBadge rating={r.rating} showRating />}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={pending} onClick={() => answer(r.id, true)}>
                <Check aria-hidden /> Aceptar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => answer(r.id, false)}
                aria-label={`Rechazar a ${r.name}`}
              >
                <X aria-hidden /> Rechazar
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="border-t-2 px-5 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
