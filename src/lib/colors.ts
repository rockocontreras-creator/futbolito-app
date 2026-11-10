// Colores típicos de camisetas y pecheras de barrio.
export const SHIRT_COLORS = [
  { hex: "#0e5a36", name: "Verde" },
  { hex: "#c8102e", name: "Rojo" },
  { hex: "#1d4ed8", name: "Azul" },
  { hex: "#0b1f4b", name: "Azul marino" },
  { hex: "#ffd23f", name: "Amarillo" },
  { hex: "#ea580c", name: "Naranjo" },
  { hex: "#6d28d9", name: "Morado" },
  { hex: "#111827", name: "Negro" },
  { hex: "#ffffff", name: "Blanco" },
  { hex: "#7dd3fc", name: "Celeste" },
] as const;

export function colorName(hex: string): string {
  return SHIRT_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? "Color";
}

/** Texto legible (negro o blanco) sobre un fondo de color, según luminancia relativa (WCAG). */
export function readableTextOn(hex: string): "#ffffff" | "#14201a" {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1]!, 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  // Contraste contra blanco vs contra casi negro: se elige el mayor.
  const vsWhite = 1.05 / (L + 0.05);
  const vsDark = (L + 0.05) / 0.0158;
  return vsWhite >= vsDark ? "#ffffff" : "#14201a";
}
