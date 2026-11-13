"use client";

import { format } from "date-fns";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteMessage, listMessages, sendMessage, type ChatMessage } from "@/server/actions/chat";

const POLL_MS = 4000;

/** Chat de la sala: se actualiza solo cada 4 s mientras la pestaña está visible. */
export function MatchChat({
  matchId,
  meId,
  canModerate,
}: {
  matchId: string;
  meId: string;
  canModerate: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);
  const lastAt = useRef<string | undefined>(undefined);
  const stickToBottom = useRef(true);

  const merge = useCallback((incoming: ChatMessage[], deletedIds: string[] = []) => {
    setMessages((cur) => {
      const gone = new Set(deletedIds);
      const byId = new Map(cur.filter((m) => !gone.has(m.id)).map((m) => [m.id, m]));
      for (const m of incoming) if (!gone.has(m.id)) byId.set(m.id, m);
      const next = [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      if (next.length) lastAt.current = next[next.length - 1]!.createdAt;
      return next;
    });
  }, []);

  const poll = useCallback(async () => {
    const res = await listMessages({ matchId, after: lastAt.current });
    if (res.ok) {
      merge(res.data.messages, res.data.deletedIds);
      setLoaded(true);
    } else {
      setError(res.error);
    }
  }, [matchId, merge]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const loop = async () => {
      if (document.visibilityState === "visible") await poll();
      if (alive) timer = setTimeout(loop, POLL_MS);
    };
    loop();
    const onVisible = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  // Baja al último mensaje si el usuario ya estaba abajo.
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = () => {
    const text = body.trim();
    if (!text) return;
    setError(null);
    startSending(async () => {
      const res = await sendMessage({ matchId, body: text });
      if (res.ok) {
        setBody("");
        stickToBottom.current = true;
        merge([res.data]);
      } else setError(res.error);
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border-2 bg-card" aria-labelledby="sala">
      <h2 id="sala" className="flex items-center gap-2 border-b-2 px-5 py-4 text-lg font-extrabold">
        <MessageCircle className="size-5 text-primary" aria-hidden /> Sala del partido
      </h2>
      <ol
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className={cn(
          "space-y-3 overflow-y-auto px-4 py-4",
          loaded && messages.length === 0 ? "py-8" : "h-80",
        )}
        aria-live="polite"
        aria-label="Mensajes"
      >
        {!loaded && <li className="text-sm text-muted-foreground">Cargando mensajes…</li>}
        {loaded && messages.length === 0 && (
          <li className="text-center text-sm text-muted-foreground">
            Nadie ha escrito todavía. Coordinen acá quién lleva la pelota y los petos.
          </li>
        )}
        {messages.map((m) => {
          const mine = m.userId === meId;
          return (
            <li key={m.id} className={cn("group flex items-end gap-2", mine && "flex-row-reverse")}>
              {!mine && <PlayerAvatar name={m.name} src={m.photo} className="size-7 text-[10px]" />}
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2",
                  mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary",
                )}
              >
                {!mine && <p className="text-[13px] font-extrabold text-primary">{m.name}</p>}
                <p className="text-[15px] break-words whitespace-pre-line">{m.body}</p>
                <p
                  className={cn(
                    "text-right text-[12px]",
                    mine ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {format(new Date(m.createdAt), "HH:mm")}
                </p>
              </div>
              {(mine || canModerate) && (
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                  aria-label="Borrar mensaje"
                  onClick={async () => {
                    if (!window.confirm("¿Borrar este mensaje?")) return;
                    const res = await deleteMessage({ messageId: m.id });
                    if (res.ok) setMessages((cur) => cur.filter((x) => x.id !== m.id));
                    else setError(res.error);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <form
        className="flex items-end gap-2 border-t-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Mensaje
        </label>
        <textarea
          id="chat-input"
          rows={1}
          maxLength={500}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escribe a la sala…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-[15px] outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
        />
        <Button
          type="submit"
          size="icon"
          className="size-11"
          disabled={sending || !body.trim()}
          aria-label="Enviar"
        >
          <Send aria-hidden />
        </Button>
      </form>
      {error && (
        <p role="alert" className="px-4 pb-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
