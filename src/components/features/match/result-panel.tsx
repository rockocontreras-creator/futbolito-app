"use client";

import { useServerAction } from "@/components/features/use-action";
import { Button } from "@/components/ui/button";
import { objectResult, withdrawObjection } from "@/server/actions/match-result";

/** Botón para que un jugador objete (o retire su objeción) mientras el resultado está pendiente. */
export function ObjectionButton({ matchId, objected }: { matchId: string; objected: boolean }) {
  const { pending, error, run } = useServerAction();
  return (
    <div className="space-y-1.5">
      {objected ? (
        <Button
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={() => run(() => withdrawObjection({ matchId }))}
        >
          Retirar mi objeción
        </Button>
      ) : (
        <Button
          variant="outline"
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/8"
          disabled={pending}
          onClick={() => {
            if (
              window.confirm("¿El resultado está mal? Si objeta más de la mitad, lo revisa un administrador.")
            ) {
              run(() => objectResult({ matchId }));
            }
          }}
        >
          El resultado está mal
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
