"use client";

import { Check, Repeat } from "lucide-react";
import { useState } from "react";
import { useServerAction } from "@/components/features/use-action";
import { Button } from "@/components/ui/button";
import { answerGoing, stopSeries } from "@/server/actions/match";

/** "¿Vas o no vas?": aparece el día del partido para cada inscrito. */
export function GoingCard({
  matchId,
  going,
  canLeave,
}: {
  matchId: string;
  going: boolean;
  /** El organizador no puede bajarse de su propio partido. */
  canLeave: boolean;
}) {
  const { pending, error, run } = useServerAction();
  const [asking, setAsking] = useState(false);

  if (going) {
    return (
      <div className="space-y-2 rounded-2xl bg-secondary p-4">
        <p className="flex items-center gap-2 font-extrabold text-primary">
          <Check className="size-5" aria-hidden strokeWidth={3} /> Confirmaste que vas
        </p>
        {canLeave &&
          (asking ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={() => run(() => answerGoing({ matchId, going: false }))}
              >
                Sí, bajarme
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setAsking(false)}>
                No
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="text-sm font-bold text-muted-foreground underline underline-offset-4 hover:text-foreground"
              onClick={() => setAsking(true)}
            >
              Ya no puedo ir
            </button>
          ))}
        {error && (
          <p role="alert" className="text-sm font-bold text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-foco bg-foco/15 p-4">
      <div>
        <h2 className="text-xl font-extrabold">¿Vas o no vas?</h2>
        <p className="text-sm text-muted-foreground">
          {canLeave
            ? "Confirma para que el resto sepa con quién cuenta. Si no vas, tu cupo pasa a la lista de espera."
            : "Confirma para que el resto sepa que el partido va."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          className={canLeave ? "" : "col-span-2"}
          disabled={pending}
          onClick={() => run(() => answerGoing({ matchId, going: true }))}
        >
          <Check aria-hidden strokeWidth={3} /> Voy
        </Button>
        {canLeave && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => answerGoing({ matchId, going: false }))}
          >
            No voy
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Aviso de pichanga fija, con el botón para dejar de repetirla (solo quien organiza). */
export function SeriesNote({
  seriesId,
  label,
  active,
  canStop,
}: {
  seriesId: string;
  label: string;
  active: boolean;
  canStop: boolean;
}) {
  const { pending, error, run } = useServerAction();
  const [asking, setAsking] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-secondary px-4 py-3">
      <Repeat className="size-5 shrink-0 text-primary" aria-hidden strokeWidth={2.4} />
      <p className="min-w-0 flex-1 basis-48 text-[15px]">
        <b className="font-extrabold">Pichanga fija.</b>{" "}
        {active
          ? `${label}. La próxima fecha se publica sola.`
          : `Era ${label.toLowerCase()}; ya no se repite.`}
      </p>
      {canStop &&
        active &&
        (asking ? (
          <span className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => stopSeries({ seriesId }))}
            >
              Sí, dejar de repetir
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setAsking(false)}>
              No
            </Button>
          </span>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAsking(true)}>
            Dejar de repetir
          </Button>
        ))}
      {error && (
        <p role="alert" className="basis-full text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
