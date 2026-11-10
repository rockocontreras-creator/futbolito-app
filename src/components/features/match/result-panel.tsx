"use client";

import { Check, X } from "lucide-react";
import { useServerAction } from "@/components/features/use-action";
import { Button } from "@/components/ui/button";
import { confirmResult, objectResult } from "@/server/actions/match-result";

/** Confirmar o rechazar el resultado reportado (solo quienes jugaron). */
export function ResultVote({ matchId, vote }: { matchId: string; vote: "yes" | "no" | null }) {
  const { pending, error, run } = useServerAction();
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">
        {vote === "yes"
          ? "Confirmaste el resultado."
          : vote === "no"
            ? "Dijiste que el resultado está mal."
            : "¿El resultado está bien?"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={vote === "yes" ? "default" : "outline"}
          disabled={pending || vote === "yes"}
          onClick={() => run(() => confirmResult({ matchId }))}
        >
          <Check aria-hidden /> Confirmo
        </Button>
        <Button
          variant="outline"
          className={
            vote === "no"
              ? "border-destructive bg-destructive/8 text-destructive"
              : "text-destructive hover:bg-destructive/8"
          }
          disabled={pending || vote === "no"}
          onClick={() => {
            if (
              window.confirm(
                "¿El marcador o los goles están mal? Si la mitad o más lo rechaza, lo revisa un administrador.",
              )
            ) {
              run(() => objectResult({ matchId }));
            }
          }}
        >
          <X aria-hidden /> Está mal
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
