// Reglas puras de inscripción a revoltijos (CLAUDE.md §5.3a). Sin BD: fáciles de testear.

export type RosterStatus = "REGISTERED" | "WAITLIST";

export interface JoinCheck {
  rating: number;
  minRating: number | null;
  maxRating: number | null;
  startsAt: Date;
  now: Date;
  status: string;
}

/** Devuelve un mensaje si el jugador no puede sumarse; null si puede. */
export function joinBlocker(c: JoinCheck): string | null {
  if (c.status === "CANCELLED") return "Este partido fue cancelado.";
  if (!["OPEN", "FULL"].includes(c.status)) return "Las inscripciones de este partido están cerradas.";
  if (c.startsAt.getTime() <= c.now.getTime()) return "Este partido ya empezó.";
  if (c.minRating != null && c.rating < c.minRating) return `Este revoltijo pide rango ${c.minRating} o más.`;
  if (c.maxRating != null && c.rating > c.maxRating)
    return `Este revoltijo es para rango ${c.maxRating} o menos.`;
  return null;
}

/** Inscrito si quedan cupos; si no, a la lista de espera. */
export function statusForNewPlayer(registered: number, capacity: number): RosterStatus {
  return registered < capacity ? "REGISTERED" : "WAITLIST";
}

/** Estado del partido según cuántos inscritos hay. */
export function matchStatusFor(registered: number, capacity: number): "OPEN" | "FULL" {
  return registered >= capacity ? "FULL" : "OPEN";
}

/**
 * Cuando alguien se baja: si era inscrito y hay lista de espera, sube el primero que llegó.
 * Devuelve el id del participante que sube (o null).
 */
export function promoteFromWaitlist(
  leavingStatus: RosterStatus,
  waitlist: readonly { id: string; joinedAt: Date }[],
): string | null {
  if (leavingStatus !== "REGISTERED" || waitlist.length === 0) return null;
  return [...waitlist].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0]!.id;
}
