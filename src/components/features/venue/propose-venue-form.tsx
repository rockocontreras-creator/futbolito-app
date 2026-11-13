"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { SURFACE_LABEL } from "@/lib/labels";
import { proposeVenueSchema } from "@/lib/validations/venue";
import { proposeVenue } from "@/server/actions/venue";
import type { LatLng } from "./map-types";
import { LocationPicker } from "./location-picker";

type FormIn = z.input<typeof proposeVenueSchema>;
type FormOut = z.output<typeof proposeVenueSchema>;

export function ProposeVenueForm({ center }: { center?: LatLng }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(proposeVenueSchema),
    defaultValues: {
      name: "",
      surface: "SYNTHETIC",
      address: "",
      isCovered: false,
      hasLighting: true,
      contact: "",
    },
  });
  const { register, formState, setValue } = form;
  const errors = formState.errors;
  const [lat, lng] = useWatch({ control: form.control, name: ["latitude", "longitude"] });
  const point = lat != null && lng != null ? { lat: Number(lat), lng: Number(lng) } : null;

  const onSubmit = form.handleSubmit(() => {
    setServerError(null);
    startTransition(async () => {
      const res = await proposeVenue(form.getValues());
      if (res.ok) router.push("/canchas?nueva=1");
      else setServerError(res.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl border-2 bg-card p-5 sm:p-6">
      <Field id="name" label="Nombre" error={errors.name?.message}>
        <Input id="name" placeholder="Ej: Sintética Villa Los Aromos" {...register("name")} />
      </Field>
      <div className="space-y-1.5">
        <span className="text-sm font-bold">Ubicación</span>
        <LocationPicker
          value={point}
          center={center}
          onChange={(p) => {
            setValue("latitude", p.lat, { shouldValidate: true });
            setValue("longitude", p.lng, { shouldValidate: true });
          }}
          error={errors.latitude?.message}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="address" label="Dirección o referencia" optional error={errors.address?.message}>
          <Input id="address" placeholder="Ej: Detrás de la escuela" {...register("address")} />
        </Field>
        <Field id="surface" label="Superficie">
          <NativeSelect id="surface" {...register("surface")}>
            {Object.entries(SURFACE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          id="referencePrice"
          label="Precio por hora (CLP)"
          optional
          error={errors.referencePrice?.message}
        >
          <Input
            id="referencePrice"
            inputMode="numeric"
            placeholder="Ej: 25000"
            {...register("referencePrice")}
          />
        </Field>
        <Field id="contact" label="Contacto para arrendar" optional error={errors.contact?.message}>
          <Input id="contact" placeholder="Ej: +56 9 1234 5678" {...register("contact")} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" {...register("hasLighting")} />
          Tiene iluminación
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" {...register("isCovered")} />
          Es techada
        </label>
      </div>
      {serverError && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/8 px-3 py-2 text-sm font-medium text-destructive"
        >
          {serverError}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Enviando…" : "Proponer cancha"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Tú la puedes usar altiro al publicar. Para el resto aparece cuando la apruebe un admin.
      </p>
    </form>
  );
}
