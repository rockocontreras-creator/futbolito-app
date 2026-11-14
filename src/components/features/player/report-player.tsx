"use client";

import { Flag } from "lucide-react";
import { useState } from "react";
import { useServerAction } from "@/components/features/use-action";
import { Button } from "@/components/ui/button";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { REPORT_CATEGORIES, type ReportCategory } from "@/lib/reports";
import { reportPlayer } from "@/server/actions/report";

/** Reportar a un jugador desde su perfil. Se abre en el mismo lugar, sin ventana emergente. */
export function ReportPlayer({ username, name }: { username: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [reason, setReason] = useState("");
  const { pending, error, run } = useServerAction();

  if (sent) {
    return (
      <p role="status" className="rounded-2xl bg-secondary px-4 py-3 text-[15px] font-bold">
        Reporte enviado. Lo va a revisar un administrador; {name} no sabrá que fuiste tú.
      </p>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        <Flag className="size-4" aria-hidden /> Reportar a este jugador
      </button>
    );
  }
  return (
    <form
      className="space-y-4 rounded-2xl border-2 bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => reportPlayer({ username, category, reason }),
          () => setSent(true),
        );
      }}
    >
      <div>
        <h2 className="text-xl font-extrabold">Reportar a {name}</h2>
        <p className="text-sm text-muted-foreground">
          Lo revisa un administrador. La persona reportada no sabe quién la reportó.
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="report-category" className="text-[15px] font-extrabold">
          Motivo
        </label>
        <NativeSelect
          id="report-category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value as ReportCategory)}
        >
          <option value="" disabled>
            Elige un motivo
          </option>
          {(Object.keys(REPORT_CATEGORIES) as ReportCategory[]).map((c) => (
            <option key={c} value={c}>
              {REPORT_CATEGORIES[c]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="report-reason" className="text-[15px] font-extrabold">
          Qué pasó
        </label>
        <Textarea
          id="report-reason"
          rows={4}
          required
          minLength={10}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Cuenta lo que pasó y en qué partido, si aplica."
        />
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="destructive"
          disabled={pending || !category || reason.trim().length < 10}
        >
          {pending ? "Enviando…" : "Enviar reporte"}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
