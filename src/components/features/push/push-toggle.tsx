"use client";

import { BellOff, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerAction } from "@/components/features/use-action";
import { Button } from "@/components/ui/button";
import { sendTestPush, subscribePush, unsubscribePush } from "@/server/actions/push";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function toKey(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function detect(): Promise<State> {
  const hasPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!hasPush) {
    // En iPhone y iPad los avisos solo existen si la página está instalada en la pantalla de inicio.
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /mac/i.test(navigator.userAgent));
    const installed = window.matchMedia("(display-mode: standalone)").matches;
    return ios && !installed ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/** Activar o desactivar los avisos al celular en este dispositivo. */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [note, setNote] = useState<string | null>(null);
  const { pending, error, run, setError } = useServerAction();

  useEffect(() => {
    let alive = true;
    detect()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState("unsupported"));
    return () => {
      alive = false;
    };
  }, []);

  const enable = async () => {
    setError(null);
    setNote(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }));
      run(
        () => subscribePush(sub.toJSON()),
        () => setState("on"),
      );
    } catch {
      setError("No pudimos activar los avisos en este dispositivo. Inténtalo de nuevo.");
    }
  };

  const disable = async () => {
    setNote(null);
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return setState("off");
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => undefined);
    run(
      () => unsubscribePush({ endpoint }),
      () => setState("off"),
    );
  };

  if (state === "loading")
    return <div className="h-[92px] animate-pulse rounded-2xl border-2 bg-card" aria-hidden />;

  const on = state === "on";
  return (
    <section
      aria-labelledby="avisos-celular"
      className="flex flex-wrap items-center gap-4 rounded-2xl border-2 bg-card p-4"
    >
      <span
        className={
          on
            ? "grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
            : "grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary"
        }
      >
        {on ? <BellRing className="size-6" aria-hidden /> : <BellOff className="size-6" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1 basis-52">
        <h2 id="avisos-celular" className="font-extrabold">
          {on ? "Avisos activados en este dispositivo" : "Avisos al celular"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {state === "ios-install" &&
            "En iPhone primero instala la app: toca Compartir, elige “Agregar a inicio”, ábrela desde el ícono nuevo y vuelve acá."}
          {state === "unsupported" && "Este navegador no permite avisos. Prueba con Chrome, Edge o Safari."}
          {state === "denied" &&
            "Los avisos están bloqueados para esta página. Permítelos en los ajustes del navegador y vuelve a entrar."}
          {state === "off" &&
            "Te avisamos aunque la página esté cerrada: partido en 2 horas, cupos, resultados."}
          {on && "Te llegan aunque la página esté cerrada."}
        </p>
        {(error || note) && (
          <p
            role={error ? "alert" : "status"}
            className={
              error ? "mt-1 text-sm font-bold text-destructive" : "mt-1 text-sm font-bold text-primary"
            }
          >
            {error ?? note}
          </p>
        )}
      </div>
      {state === "off" && (
        <Button onClick={() => void enable()} disabled={pending}>
          {pending ? "Activando…" : "Activar avisos"}
        </Button>
      )}
      {on && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(
                () => sendTestPush(),
                () => setNote("Enviado. Debería llegar en unos segundos."),
              )
            }
          >
            Probar
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => void disable()}>
            Desactivar
          </Button>
        </div>
      )}
    </section>
  );
}
