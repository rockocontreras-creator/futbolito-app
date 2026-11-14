"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useServerAction } from "@/components/features/use-action";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { acceptChallenge, cancelChallenge } from "@/server/actions/challenge";

/** Aceptar un desafío con uno de los equipos donde soy capitán. */
export function AcceptChallenge({
  challengeId,
  teams,
}: {
  challengeId: string;
  teams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const { pending, error, run } = useServerAction();
  const chosen = teams.find((t) => t.id === teamId);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {teams.length > 1 && (
          <>
            <label htmlFor={`equipo-${challengeId}`} className="sr-only">
              Con qué equipo
            </label>
            <NativeSelect
              id={`equipo-${challengeId}`}
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="h-11 w-auto min-w-40"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </>
        )}
        <Button
          disabled={pending || !chosen}
          onClick={() =>
            run(
              () => acceptChallenge({ challengeId, teamId }),
              (data) => router.push(`/partidos/${(data as { matchId: string }).matchId}`),
            )
          }
        >
          {pending
            ? "Aceptando…"
            : teams.length > 1
              ? "Aceptar desafío"
              : `Aceptar con ${chosen?.name ?? ""}`}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function CancelChallenge({ challengeId }: { challengeId: string }) {
  const [asking, setAsking] = useState(false);
  const { pending, error, run } = useServerAction();
  return (
    <div className="space-y-2">
      {asking ? (
        <span className="flex items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => run(() => cancelChallenge({ challengeId }))}
          >
            Sí, cancelar
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setAsking(false)}>
            No
          </Button>
        </span>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAsking(true)}>
          Cancelar desafío
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
