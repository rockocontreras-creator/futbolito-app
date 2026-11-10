"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { SURFACE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { createPickupSchema, NEW_VENUE } from "@/lib/validations/match";
import { createPickup } from "@/server/actions/match";
import { ShirtColorPicker } from "./shirt-color-picker";
import { LocationPicker } from "@/components/features/venue/location-picker";
import type { LatLng } from "@/components/features/venue/map-types";
import { VenueMap } from "@/components/features/venue/venue-map";
import { Map as MapIcon } from "lucide-react";

type FormIn = z.input<typeof createPickupSchema>;
type FormOut = z.output<typeof createPickupSchema>;

const FORMATS = [5, 6, 7, 8, 9] as const;

export function PublishPickupForm({
  venues,
  defaultStart,
  center,
}: {
  venues: { id: string; name: string; status: string; latitude: number | null; longitude: number | null }[];
  defaultStart: string;
  center?: LatLng;
}) {
  const [showMap, setShowMap] = useState(false);
  const mappable = venues.filter((v) => v.latitude != null && v.longitude != null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(createPickupSchema),
    defaultValues: {
      venueId: venues[0]?.id ?? NEW_VENUE,
      newVenueName: "",
      newVenueSurface: "SYNTHETIC",
      startsAtLocal: defaultStart,
      durationMinutes: "60",
      playersPerSide: "7",
      maxPlayers: "14",
      minRating: "",
      maxRating: "",
      pricePerPerson: "",
      notes: "",
      colorA: "#0e5a36",
      colorB: "#ffd23f",
    },
  });
  const { register, formState, setValue, setError } = form;
  const errors = formState.errors;
  const venueId = useWatch({ control: form.control, name: "venueId" });
  const [colorA, colorB] = useWatch({ control: form.control, name: ["colorA", "colorB"] });
  const [newLat, newLng] = useWatch({ control: form.control, name: ["newVenueLat", "newVenueLng"] });
  const newPoint = newLat != null && newLng != null ? { lat: Number(newLat), lng: Number(newLng) } : null;
  const playersPerSide = Number(useWatch({ control: form.control, name: "playersPerSide" }));

  const onSubmit = form.handleSubmit(() => {
    setServerError(null);
    startTransition(async () => {
      const res = await createPickup(form.getValues());
      if (res.ok) {
        router.push(`/partidos/${res.data.id}?publicado=1`);
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
      <fieldset className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
        <legend className="sr-only">Dónde y cuándo</legend>
        <h2 className="text-lg font-bold">Dónde y cuándo</h2>
        <Field id="venueId" label="Cancha" error={err("venueId")}>
          <NativeSelect id="venueId" {...register("venueId")} {...aria("venueId")}>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.status === "PENDING" ? " (por aprobar)" : ""}
              </option>
            ))}
            <option value={NEW_VENUE}>Otra cancha (agregarla)</option>
          </NativeSelect>
        </Field>
        {mappable.length > 0 && venueId !== NEW_VENUE && (
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowMap((v) => !v)}
              aria-expanded={showMap}
            >
              <MapIcon aria-hidden /> {showMap ? "Ocultar mapa" : "Elegir en el mapa"}
            </Button>
            {showMap && (
              <VenueMap
                center={center}
                venues={mappable.map((v) => ({
                  id: v.id,
                  name: v.name,
                  lat: v.latitude!,
                  lng: v.longitude!,
                  pending: v.status === "PENDING",
                }))}
                selectedId={venueId}
                onSelect={(id) => setValue("venueId", id, { shouldValidate: true })}
              />
            )}
          </div>
        )}
        {venueId === NEW_VENUE && (
          <div className="grid gap-4 rounded-xl bg-secondary/60 p-4 sm:grid-cols-[1.4fr_1fr]">
            <Field
              id="newVenueName"
              label="Nombre de la cancha"
              hint="Un admin la revisa, pero puedes usarla altiro."
              error={err("newVenueName")}
            >
              <Input
                id="newVenueName"
                placeholder="Ej: Cancha sintética Villa Los Aromos"
                {...register("newVenueName")}
                {...aria("newVenueName")}
              />
            </Field>
            <Field id="newVenueSurface" label="Superficie">
              <NativeSelect id="newVenueSurface" {...register("newVenueSurface")}>
                {Object.entries(SURFACE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-semibold">
                Ubicación{" "}
                <span className="font-normal text-muted-foreground">(opcional, ayuda a llegar)</span>
              </span>
              <LocationPicker
                value={newPoint}
                center={center}
                onChange={(p) => {
                  setValue("newVenueLat", p.lat);
                  setValue("newVenueLng", p.lng);
                }}
              />
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
          <Field id="startsAtLocal" label="Día y hora" error={err("startsAtLocal")}>
            <Input
              id="startsAtLocal"
              type="datetime-local"
              step={900}
              {...register("startsAtLocal")}
              {...aria("startsAtLocal")}
            />
          </Field>
          <Field id="durationMinutes" label="Duración" error={err("durationMinutes")}>
            <NativeSelect id="durationMinutes" {...register("durationMinutes")}>
              <option value="60">1 hora</option>
              <option value="90">1 hora y media</option>
              <option value="120">2 horas</option>
            </NativeSelect>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
        <legend className="sr-only">Formato y cupos</legend>
        <h2 className="text-lg font-bold">Formato y cupos</h2>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold" id="formato-label">
            Jugadores por lado
          </p>
          <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-labelledby="formato-label">
            {FORMATS.map((n) => {
              const active = playersPerSide === n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setValue("playersPerSide", String(n));
                    setValue("maxPlayers", String(n * 2), { shouldValidate: formState.isSubmitted });
                  }}
                  className={cn(
                    "rounded-xl border py-3 text-center transition-colors focus-visible:ring-4 focus-visible:ring-ring/30",
                    active ? "border-cancha bg-cancha text-white" : "bg-card hover:bg-secondary",
                  )}
                >
                  <span className="block text-xl leading-none font-score">
                    {n}v{n}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="maxPlayers"
            label="Cupos totales"
            hint="Incluyéndote. Los que lleguen después quedan en espera."
            error={err("maxPlayers")}
          >
            <Input
              id="maxPlayers"
              type="number"
              inputMode="numeric"
              min={8}
              max={30}
              {...register("maxPlayers")}
              {...aria("maxPlayers")}
            />
          </Field>
          <Field
            id="pricePerPerson"
            label="Costo por persona (CLP)"
            optional
            hint="Lo que sale el arriendo dividido."
            error={err("pricePerPerson")}
          >
            <Input
              id="pricePerPerson"
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              placeholder="Ej: 2500"
              {...register("pricePerPerson")}
              {...aria("pricePerPerson")}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
        <legend className="sr-only">Detalles</legend>
        <h2 className="text-lg font-bold">Detalles</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="minRating"
            label="Rango mínimo"
            optional
            hint="Ej: 900 para Plata hacia arriba."
            error={err("minRating")}
          >
            <Input
              id="minRating"
              type="number"
              inputMode="numeric"
              placeholder="Sin mínimo"
              {...register("minRating")}
              {...aria("minRating")}
            />
          </Field>
          <Field id="maxRating" label="Rango máximo" optional error={err("maxRating")}>
            <Input
              id="maxRating"
              type="number"
              inputMode="numeric"
              placeholder="Sin máximo"
              {...register("maxRating")}
              {...aria("maxRating")}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ShirtColorPicker
            label="Color del equipo A"
            value={colorA ?? "#0e5a36"}
            onChange={(hex) => setValue("colorA", hex, { shouldValidate: true })}
            error={err("colorA")}
          />
          <ShirtColorPicker
            label="Color del equipo B"
            value={colorB ?? "#ffd23f"}
            onChange={(hex) => setValue("colorB", hex, { shouldValidate: true })}
            error={err("colorB")}
          />
        </div>
        <Field
          id="notes"
          label="Notas"
          optional
          hint="Petos, pelota, si se juega con o sin arquero fijo…"
          error={err("notes")}
        >
          <Textarea id="notes" rows={3} {...register("notes")} {...aria("notes")} />
        </Field>
      </fieldset>

      {serverError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm font-medium text-destructive"
        >
          {serverError}
        </p>
      )}
      <div className="sticky bottom-20 z-10 md:static">
        <Button
          type="submit"
          size="lg"
          variant="foco"
          className="w-full shadow-lg md:w-auto md:shadow-none"
          disabled={pending}
        >
          {pending ? "Publicando…" : "Publicar revoltijo"}
        </Button>
      </div>
    </form>
  );
}
