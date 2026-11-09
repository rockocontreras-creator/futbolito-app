/** Link de Google Maps con ruta hasta la cancha (abre la app en el teléfono). */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** Centro aproximado de San Clemente (si la comuna no tiene coordenadas). */
export const DEFAULT_CENTER = { lat: -35.5386, lng: -71.4867 } as const;
