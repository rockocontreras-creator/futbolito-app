"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { FOOT_LABEL, POSITION_LABEL, SKILL_LABEL } from "@/lib/labels";
import { INITIAL_PLAYER_RATING } from "@/lib/rating/elo";
import { cn } from "@/lib/utils";
import { playerProfileSchema } from "@/lib/validations/player";
import { uploadProfilePhoto } from "@/server/actions/photo";
import { createProfile, updateProfile } from "@/server/actions/profile";
import { DivisionBadge } from "./division-badge";
import { PhotoPicker, PhotoUpload } from "./photo-upload";

type FormIn = z.input<typeof playerProfileSchema>;
type FormOut = z.output<typeof playerProfileSchema>;

const SKILL_HINT = {
  BEGINNER: "Juego de vez en cuando, por diversión.",
  INTERMEDIATE: "Juego seguido y me defiendo bien.",
  ADVANCED: "Juego en serio, liga o selección.",
} as const;

export function ProfileForm({
  defaultName,
  sectors,
  returnTo,
  initial,
  photo,
}: {
  defaultName: string;
  sectors: { id: string; name: string }[];
  returnTo: string | null;
  /** Si viene, el formulario edita un perfil existente. */
  initial?: Partial<Record<keyof FormIn, string>>;
  /** Foto actual (al editar) o la que trae la cuenta de Google (al crear). */
  photo?: string | null;
}) {
  const editing = Boolean(initial);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pickedPhoto, setPickedPhoto] = useState<Blob | null>(null);
  // Perfil creado pero la foto falló: se avisa y se deja seguir.
  const [createdAs, setCreatedAs] = useState<string | null>(null);
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(playerProfileSchema),
    defaultValues: {
      displayName: defaultName,
      username: "",
      nickname: "",
      birthDate: "",
      gender: "",
      phone: "",
      sectorId: "",
      primaryPosition: "MIDFIELDER",
      secondaryPosition: "",
      foot: "RIGHT",
      skillLevel: "INTERMEDIATE",
      ...initial,
    } as FormIn,
  });
  const { register, formState, setValue, setError } = form;
  const errors = formState.errors;
  const skill = useWatch({ control: form.control, name: "skillLevel" }) as keyof typeof SKILL_LABEL;
  const primary = useWatch({ control: form.control, name: "primaryPosition" });

  const onSubmit = form.handleSubmit(() => {
    setServerError(null);
    startTransition(async () => {
      const res = await (editing ? updateProfile : createProfile)(form.getValues());
      if (res.ok) {
        const next = returnTo ?? `/jugador/${res.data.username}`;
        if (!editing && pickedPhoto) {
          const fd = new FormData();
          fd.set("photo", pickedPhoto, "foto");
          const up = await uploadProfilePhoto(fd);
          if (!up.ok) {
            setCreatedAs(next);
            setServerError(`Tu perfil quedó creado, pero la foto no se subió. ${up.error}`);
            return;
          }
        }
        router.push(next);
        router.refresh();
        return;
      }
      setServerError(res.error);
      for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
        if (messages[0]) setError(field as keyof FormIn, { message: messages[0] });
      }
    });
  });

  const err = (name: keyof FormIn) => errors[name]?.message as string | undefined;
  const aria = (name: keyof FormIn) => ({
    "aria-invalid": Boolean(errors[name]) || undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <fieldset className="space-y-5 rounded-2xl border-2 bg-card p-5 sm:p-6">
        <legend className="sr-only">Quién eres</legend>
        <h2 className="text-xl font-extrabold">Quién eres</h2>
        {editing ? (
          <PhotoUpload name={defaultName} photoUrl={photo ?? null} />
        ) : (
          <PhotoPicker name={defaultName} fallbackUrl={photo} onPick={setPickedPhoto} />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="displayName" label="Nombre y apellido" error={err("displayName")}>
            <Input
              id="displayName"
              autoComplete="name"
              {...register("displayName")}
              {...aria("displayName")}
            />
          </Field>
          <Field
            id="nickname"
            label="¿Cómo te dicen en la cancha?"
            optional
            hint="Tu apodo. Es el nombre que sale en tu carta."
            error={err("nickname")}
          >
            <Input
              id="nickname"
              placeholder="Ej: Chino, Flaco, Mago"
              {...register("nickname")}
              {...aria("nickname")}
            />
          </Field>
          <Field id="username" label="Usuario" hint="Tu link será /jugador/usuario" error={err("username")}>
            <Input
              id="username"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="ej: rocko9"
              {...register("username")}
              {...aria("username")}
            />
          </Field>
          <Field
            id="birthDate"
            label="Fecha de nacimiento"
            hint="Desde 14 años. Solo se muestra tu edad (a menores de 18, ni eso)."
            error={err("birthDate")}
          >
            <Input id="birthDate" type="date" {...register("birthDate")} {...aria("birthDate")} />
          </Field>
          <Field id="gender" label="Género" optional hint="Solo se usa para la etiqueta “Jugadora”.">
            <NativeSelect id="gender" {...register("gender")}>
              <option value="">Prefiero no decir</option>
              <option value="FEMALE">Mujer</option>
              <option value="MALE">Hombre</option>
              <option value="OTHER">Otro</option>
            </NativeSelect>
          </Field>
          <Field
            id="phone"
            label="Celular"
            optional
            hint="Solo lo ven tus compañeros de partido."
            error={err("phone")}
          >
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+56 9 1234 5678"
              {...register("phone")}
              {...aria("phone")}
            />
          </Field>
          {sectors.length > 0 && (
            <Field id="sectorId" label="Sector" optional error={err("sectorId")}>
              <NativeSelect id="sectorId" {...register("sectorId")}>
                <option value="">Prefiero no decir</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-5 rounded-2xl border-2 bg-card p-5 sm:p-6">
        <legend className="sr-only">Cómo juegas</legend>
        <h2 className="text-xl font-extrabold">Cómo juegas</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="primaryPosition" label="Posición">
            <NativeSelect id="primaryPosition" {...register("primaryPosition")}>
              {Object.entries(POSITION_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="secondaryPosition" label="Otra posición" optional error={err("secondaryPosition")}>
            <NativeSelect
              id="secondaryPosition"
              {...register("secondaryPosition")}
              {...aria("secondaryPosition")}
            >
              <option value="">Ninguna</option>
              {Object.entries(POSITION_LABEL)
                .filter(([v]) => v !== primary)
                .map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <Field id="foot" label="Pie hábil">
            <NativeSelect id="foot" {...register("foot")}>
              {Object.entries(FOOT_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className={cn("space-y-2", editing && "hidden")}>
          <p className="text-sm font-bold" id="nivel-label">
            ¿Qué tan bueno eres?
          </p>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-labelledby="nivel-label">
            {(Object.keys(SKILL_LABEL) as (keyof typeof SKILL_LABEL)[]).map((level) => {
              const active = skill === level;
              return (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setValue("skillLevel", level)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors focus-visible:ring-4 focus-visible:ring-ring/30",
                    active ? "border-primary bg-secondary" : "bg-card hover:bg-secondary/60",
                  )}
                >
                  <span className="block font-extrabold">{SKILL_LABEL[level]}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{SKILL_HINT[level]}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[15px] text-muted-foreground">
            Partes con{" "}
            <DivisionBadge
              rating={INITIAL_PLAYER_RATING[skill]}
              showRating
              className="align-middle text-foreground"
            />{" "}
            y de ahí sube o baja según tus resultados.
          </p>
        </div>
      </fieldset>

      {serverError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm font-medium text-destructive"
        >
          {serverError}
        </p>
      )}
      {createdAs ? (
        <Button type="button" size="lg" className="w-full md:w-auto" onClick={() => router.push(createdAs)}>
          Ir a mi perfil
        </Button>
      ) : (
        <Button type="submit" size="lg" className="w-full md:w-auto" disabled={pending}>
          {pending
            ? editing
              ? "Guardando…"
              : "Creando perfil…"
            : editing
              ? "Guardar cambios"
              : "Crear mi perfil"}
        </Button>
      )}
    </form>
  );
}
