import { formatMatchDate } from "@/lib/format";

/** Texto prearmado para compartir un revoltijo por WhatsApp (CLAUDE.md §5.3a). */
export function pickupShareText(p: {
  playersPerSide: number;
  startsAt: Date;
  venueName: string | null;
  missing: number;
  url: string;
}): string {
  const where = p.venueName ? ` en ${p.venueName}` : "";
  const need =
    p.missing <= 0
      ? "Está completo, pero hay lista de espera."
      : p.missing === 1
        ? "¡Falta 1!"
        : `Faltan ${p.missing}.`;
  return `⚽ Revoltijo ${p.playersPerSide}v${p.playersPerSide} el ${formatMatchDate(p.startsAt)}${where}. ${need} ¿Te sumas? ${p.url}`;
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Chat directo de WhatsApp a un celular chileno guardado como "+56 9 1234 5678". */
export function whatsappTo(phone: string, text?: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!/^569\d{8}$/.test(digits)) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** "Faltan 2 · Arquero, Defensa" → texto para compartir un "se busca". */
export function requestShareText(p: {
  playersNeeded: number;
  positions: readonly string[];
  startsAt: Date;
  venueName: string | null;
  url: string;
}): string {
  const who = p.positions.length ? ` (${p.positions.join(", ").toLowerCase()})` : "";
  const need = p.playersNeeded === 1 ? `Nos falta 1${who}` : `Nos faltan ${p.playersNeeded}${who}`;
  const where = p.venueName ? ` en ${p.venueName}` : "";
  return `⚽ ${need} para el ${formatMatchDate(p.startsAt)}${where}. ¿Te animas? ${p.url}`;
}
