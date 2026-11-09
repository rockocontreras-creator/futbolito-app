"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { DEFAULT_CENTER, directionsUrl } from "@/lib/maps";
import { cn } from "@/lib/utils";
import type { LatLng, VenueMapProps } from "./map-types";

// Pin propio (los íconos por defecto de Leaflet no cargan con bundlers y además no calzan con el diseño).
function pin(kind: "venue" | "selected" | "pending" | "pick") {
  const fill = { venue: "#0e5a36", selected: "#ffd23f", pending: "#8a9a90", pick: "#d92d20" }[kind];
  const dot = kind === "selected" ? "#0e5a36" : "#ffffff";
  return L.divIcon({
    className: "",
    iconSize: [30, 40],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
    html: `<svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true"><path d="M15 39s13-13.6 13-23.5C28 7.5 22.2 1.5 15 1.5S2 7.5 2 15.5C2 25.4 15 39 15 39Z" fill="${fill}" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/><circle cx="15" cy="15" r="5.5" fill="${dot}"/></svg>`,
  });
}

function FitToVenues({ points, enabled }: { points: LatLng[]; enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || points.length < 2) return;
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 16 });
  }, [map, points, enabled]);
  return null;
}

function PickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function VenueMapInner({
  venues,
  center,
  zoom = 14,
  selectedId,
  onSelect,
  pick,
  className,
}: VenueMapProps) {
  const start = pick?.value ?? center ?? venues[0] ?? DEFAULT_CENTER;
  const points = useMemo(() => venues.map((v) => ({ lat: v.lat, lng: v.lng })), [venues]);
  const icons = useMemo(
    () => ({ venue: pin("venue"), selected: pin("selected"), pending: pin("pending"), pick: pin("pick") }),
    [],
  );

  return (
    <MapContainer
      center={[start.lat, start.lng]}
      zoom={zoom}
      scrollWheelZoom={false}
      className={cn("z-0 h-72 w-full rounded-xl border", pick && "cursor-crosshair", className)}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToVenues points={points} enabled={!pick} />
      {venues.map((v) => (
        <Marker
          key={v.id}
          position={[v.lat, v.lng]}
          icon={v.id === selectedId ? icons.selected : v.pending ? icons.pending : icons.venue}
          eventHandlers={onSelect ? { click: () => onSelect(v.id) } : undefined}
        >
          {!onSelect && (
            <Popup>
              <strong>{v.name}</strong>
              {v.subtitle && <div>{v.subtitle}</div>}
              <a href={directionsUrl(v.lat, v.lng)} target="_blank" rel="noopener noreferrer">
                Cómo llegar
              </a>
            </Popup>
          )}
        </Marker>
      ))}
      {pick && (
        <>
          <PickHandler onPick={pick.onChange} />
          {pick.value && <Marker position={[pick.value.lat, pick.value.lng]} icon={icons.pick} />}
        </>
      )}
    </MapContainer>
  );
}
