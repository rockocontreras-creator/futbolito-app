"use client";

import dynamic from "next/dynamic";
import type { VenueMapProps } from "./map-types";

// Leaflet usa `window`: se carga solo en el navegador.
const Inner = dynamic(() => import("./venue-map-inner"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-xl border bg-secondary" aria-hidden />,
});

export function VenueMap(props: VenueMapProps) {
  return (
    <div role="region" aria-label="Mapa de canchas">
      <Inner {...props} />
    </div>
  );
}
