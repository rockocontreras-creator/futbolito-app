"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { POSITION_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { createRequestSchema } from "@/lib/validations/request";
import { createPlayerRequest } from "@/server/actions/request";

type FormIn = z.input<typeof createRequestSchema>;
type FormOut = z.output<typeof createRequestSchema>;
type Pos = keyof typeof POSITION_LABEL;

export function RequestForm({
  venues,
  defaultStart,
}: {
  venues: { id: string; name: string }[];
  defaultStart: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      startsAtLocal: defaultStart,
      venueId: "",
      playersNeeded: 1,
      positions: [],
      minRating: "",
      maxRating: "",
      notes: "",
    },
  });
  const { register, formState, setValue, setError } = form;
  const errors = formState.errors;
  const needed = Number(useWatch({ control: form.control, name: "playersNeeded" }) ?? 1);
  const positions = (useWatch({ control: form.control, name: "positions" }) ?? []) as Pos[];

  const togglePos = (p: Pos) =>
    setValue("positions", positions.includes(p) ? positions.filter((x) => x !== p) : [...positions, p]);

  const onSubmit = form.handleSubmit(() => {
    setServerError(null);
    startTransition(async () => {
      const res = await createPlayerRequest(form.getValues());
      if (res.ok) {
        router.push(`/se-busca/${res.data.id}`);
        return;
      }
      setServerError(res.error);
      for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
        if (messages[0]) setError(field as keyof FormIn, { message: messages[0] });
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
      <div className="space-y-2">
        <span className="text-sm font-semibold">¿Cuántos faltan?</span>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Uno menos"
            disabled={needed <= 1}
            onClick={() => setValue("playersNeeded", needed - 1)}
          >
            <Minus aria-hidden />
          </Button>
          <span className="w-16 text-center text-6xl leading-none font-score" aria-live="polite">
            {needed}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Uno más"
            disabled={needed >= 11}
            onClick={() => setValue("playersNeeded", needed + 1)}
          >
            <Plus aria-hidden />
          </Button>
          <span className="text-muted-foreground">{needed === 1 ? "jugador" : "jugadores"}</span>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">
          ¿Qué posición? <span className="font-normal text-muted-foreground">(si no eliges, cualquiera)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(POSITION_LABEL) as Pos[]).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={positions.includes(p)}
              onClick={() => togglePos(p)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none",
                positions.includes(p)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-secondary",
              )}
            >
              {POSITION_LABEL[p]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="startsAtLocal" label="Día y hora" error={errors.startsAtLocal?.message}>
          <Input id="startsAtLocal" type="datetime-local" step={900} {...register("startsAtLocal")} />
        </Field>
        <Field id="venueId" label="Cancha">
          <NativeSelect id="venueId" {...register("venueId")}>
            <option value="">A coordinar</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="minRating" label="Rango mínimo" optional error={errors.minRating?.message}>
          <Input id="minRating" inputMode="numeric" placeholder="Ej: 900" {...register("minRating")} />
        </Field>
        <Field id="maxRating" label="Rango máximo" optional error={errors.maxRating?.message}>
          <Input id="maxRating" inputMode="numeric" placeholder="Ej: 1300" {...register("maxRating")} />
        </Field>
      </div>
      <Field
        id="notes"
        label="Detalles"
        optional
        hint="Ej: somos 9, jugamos 5v5, se paga $2.000."
        error={errors.notes?.message}
      >
        <Textarea id="notes" maxLength={300} {...register("notes")} />
      </Field>
      {serverError && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/8 px-3 py-2 text-sm font-medium text-destructive"
        >
          {serverError}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Publicando…" : "Publicar búsqueda"}
      </Button>
    </form>
  );
}
