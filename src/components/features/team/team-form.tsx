"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { SHIRT_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { createTeamSchema } from "@/lib/validations/team";
import { createTeam } from "@/server/actions/team";
import { TeamCrest } from "./team-crest";

type FormIn = z.input<typeof createTeamSchema>;
type FormOut = z.output<typeof createTeamSchema>;

const COLORS = SHIRT_COLORS;

export function TeamForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: "", primaryColor: "#0e5a36", secondaryColor: "#ffffff", description: "" },
  });
  const { register, formState, setValue, setError } = form;
  const errors = formState.errors;
  const [name, primary, secondary] = useWatch({
    control: form.control,
    name: ["name", "primaryColor", "secondaryColor"],
  });

  const onSubmit = form.handleSubmit(() => {
    setServerError(null);
    startTransition(async () => {
      const res = await createTeam(form.getValues());
      if (res.ok) {
        router.push(`/equipo/${res.data.slug}`);
        return;
      }
      setServerError(res.error);
      for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
        if (messages[0]) setError(field as keyof FormIn, { message: messages[0] });
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 md:grid-cols-[1fr_260px]">
      <div className="space-y-5 rounded-2xl border bg-card p-6">
        <Field id="name" label="Nombre del equipo" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="off"
            placeholder="Ej: Los Cracks de la Villa"
            aria-invalid={Boolean(errors.name) || undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name")}
          />
        </Field>

        <ColorPicker
          label="Color principal"
          value={primary}
          onChange={(hex) => setValue("primaryColor", hex, { shouldValidate: true })}
          error={errors.primaryColor?.message}
        />
        <ColorPicker
          label="Color secundario"
          value={secondary}
          onChange={(hex) => setValue("secondaryColor", hex, { shouldValidate: true })}
          error={errors.secondaryColor?.message}
        />

        <Field
          id="description"
          label="Descripción"
          optional
          hint="De dónde son, cuándo juegan, si buscan jugadores."
          error={errors.description?.message}
        >
          <Textarea id="description" maxLength={280} {...register("description")} />
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
          {pending ? "Creando equipo…" : "Crear equipo"}
        </Button>
      </div>

      <aside className="order-first space-y-3 md:order-none">
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center">
          <TeamCrest name={name || "Mi equipo"} primary={primary} secondary={secondary} className="size-24" />
          <p className="text-xl font-display">{name || "Tu equipo"}</p>
          <p className="text-sm text-muted-foreground">Quedas como capitán. Arranca con rango 1000.</p>
        </div>
      </aside>
    </form>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            onClick={() => onChange(c.hex)}
            aria-pressed={value === c.hex}
            aria-label={c.name}
            title={c.name}
            className={cn(
              "size-9 rounded-full border border-black/15 ring-offset-2 ring-offset-card transition-shadow outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
              value === c.hex && "ring-[3px] ring-primary",
            )}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-[13px] font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
