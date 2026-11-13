"use client";

import { Check, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { useServerAction } from "@/components/features/use-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { answerOffer, closePlayerRequest, offerToPlay, withdrawOffer } from "@/server/actions/request";

export function OfferButton({ requestId }: { requestId: string }) {
  const [message, setMessage] = useState("");
  const { pending, error, run } = useServerAction();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => offerToPlay({ requestId, message }));
      }}
    >
      <label htmlFor="offer-msg" className="text-sm font-bold">
        Mensaje <span className="font-normal text-muted-foreground">(opcional)</span>
      </label>
      <Input
        id="offer-msg"
        maxLength={200}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ej: Juego de arquero, llego altiro"
      />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Enviando…" : "Me ofrezco"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

export function WithdrawOfferButton({ requestId }: { requestId: string }) {
  const { pending, error, run } = useServerAction();
  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        className="w-full text-destructive hover:bg-destructive/8"
        disabled={pending}
        onClick={() => run(() => withdrawOffer({ requestId }))}
      >
        Ya no puedo ir
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function AnswerOffer({ responseId }: { responseId: string }) {
  const { pending, error, run } = useServerAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(() => answerOffer({ responseId, accept: true }))}
        >
          <Check aria-hidden /> Aceptar
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-label="Rechazar"
          disabled={pending}
          onClick={() => run(() => answerOffer({ responseId, accept: false }))}
        >
          <X aria-hidden />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function CloseRequest({ requestId }: { requestId: string }) {
  const { pending, error, run } = useServerAction();
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={() => run(() => closePlayerRequest({ requestId, filled: true }))}
      >
        Ya completamos
      </Button>
      <Button
        variant="ghost"
        className="w-full text-destructive hover:bg-destructive/8"
        disabled={pending}
        onClick={() => {
          if (window.confirm("¿Cancelar esta búsqueda?"))
            run(() => closePlayerRequest({ requestId, filled: false }));
        }}
      >
        Cancelar búsqueda
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function WhatsAppContact({ href, label }: { href: string; label: string }) {
  return (
    <Button
      asChild
      size="sm"
      variant="outline"
      className="border-[#25D366] text-[#128C4B] hover:bg-[#25D366]/10 dark:text-[#5fe08f]"
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle aria-hidden /> {label}
      </a>
    </Button>
  );
}
