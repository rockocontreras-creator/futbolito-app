"use client";

import { LocateFixed } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LatLng } from "./map-types";
import { VenueMap } from "./venue-map";

/** Mapa para marcar dónde queda una cancha: clic en el mapa o "Usar mi ubicación". */
export function LocationPicker({
  value,
  onChange,
  center,
  error,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  center?: LatLng;
  error?: string;
}) {
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const locate = () => {
    if (!navigator.geolocation) return setGeoError("Tu navegador no permite ubicarte. Marca en el mapa.");
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setGeoError("No pudimos ubicarte. Marca la cancha tocando el mapa.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {value ? "Listo. Puedes tocar otro punto para corregir." : "Toca el mapa donde está la cancha."}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={locate} disabled={locating}>
          <LocateFixed aria-hidden /> {locating ? "Buscando…" : "Estoy en la cancha"}
        </Button>
      </div>
      <VenueMap venues={[]} center={center} zoom={15} pick={{ value, onChange }} />
      {(error || geoError) && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error ?? geoError}
        </p>
      )}
    </div>
  );
}
