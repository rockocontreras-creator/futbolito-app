"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { createChallengeSchema } from "@/lib/validations/challenge";
import { createChallenge } from "@/server/actions/challenge";

type FormIn = z.input<typeof createChallengeSchema>;
type FormOut = z.output<typeof createChallengeSchema>;

export function ChallengeForm({
  teams,
  venues,
  defaultStart,
  rival,
}: {
  teams: { id: string; name: string }[];
  venues: { id: string; name: string }[];
  defaultStart: string;
  /** Desafío directo a este equipo. */
  rival?: { slug: string; name: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(createChallengeSchema),
    defaultValues: {
      teamId: teams[0]?.id ?? "",
      startsAtLocal: defaultStart,
      venueId: "",
      playersPerSide: 7,
      notes: "",
      rivalSlug: rival?.slug,
    },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const onSubmit = form.handleSubmit(() => {
    setServerError(null);
    startTransition(async () => {
      const res = await createChallenge(form.getValues());
      if (res.ok) {
        router.push("/desafios");
        router.refresh();
        return;
      }
      setServerError(res.error);
      for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
        if (messages?.[0]) form.setError(field as keyof FormIn, { message: messages[0] });
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl border-2 bg-card p-5 md:p-7">
      {rival && (
        <p className="rounded-2xl bg-secondary px-4 py-3 text-[15px]">
          Desafío directo a <b className="font-extrabold">{rival.name}</b>: solo ese equipo puede aceptarlo.
        </p>
      )}
      <Field id="teamId" label="Tu equipo" error={errors.teamId?.message}>
        <NativeSelect id="teamId" {...register("teamId")} disabled={teams.length === 1}>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="startsAtLocal" label="Día y hora" error={errors.startsAtLocal?.message}>
          <Input id="startsAtLocal" type="datetime-local" {...register("startsAtLocal")} />
        </Field>
        <Field id="playersPerSide" label="Formato" error={errors.playersPerSide?.message}>
          <NativeSelect id="playersPerSide" {...register("playersPerSide")}>
            {[5, 6, 7, 8, 9, 11].map((n) => (
              <option key={n} value={n}>
                {n} contra {n}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field
        id="venueId"
        label="Cancha"
        hint="Si todavía no la tienen, déjala a coordinar y la ven en la sala del partido."
        error={errors.venueId?.message}
      >
        <NativeSelect id="venueId" {...register("venueId")}>
          <option value="">A coordinar con el rival</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field
        id="notes"
        label="Notas"
        optional
        hint="Quién pone la cancha, si va con arquero, nivel que buscan…"
        error={errors.notes?.message}
      >
        <Textarea id="notes" rows={3} maxLength={300} {...register("notes")} />
      </Field>
      {serverError && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
          {serverError}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full md:w-auto" disabled={pending}>
        {pending ? "Publicando…" : rival ? "Mandar desafío" : "Publicar desafío"}
      </Button>
    </form>
  );
}
