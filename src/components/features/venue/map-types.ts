export interface MapVenue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string;
  pending?: boolean;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface VenueMapProps {
  venues: MapVenue[];
  center?: LatLng;
  zoom?: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Modo "marcar ubicación": un clic en el mapa pone el pin. */
  pick?: { value: LatLng | null; onChange: (p: LatLng) => void };
  className?: string;
}
