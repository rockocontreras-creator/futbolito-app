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
