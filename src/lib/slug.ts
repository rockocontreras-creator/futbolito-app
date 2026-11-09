/** "Los Cracks de la Villa" → "los-cracks-de-la-villa". Quita tildes y símbolos. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

/** Primer slug libre: "base", "base-2", "base-3"… según los ya usados. */
export function nextFreeSlug(base: string, taken: readonly string[]): string {
  const root = base || "equipo";
  const used = new Set(taken);
  if (!used.has(root)) return root;
  for (let n = 2; ; n++) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** Iniciales para el escudo: "Los Cracks de la Villa" → "CV" (ignora artículos y preposiciones). */
export function teamInitials(name: string): string {
  const skip = new Set(["los", "las", "el", "la", "de", "del", "y", "fc", "cd", "club"]);
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^A-Za-z0-9ñÑ]+/)
    .filter(Boolean);
  const meaningful = words.filter((w) => !skip.has(w.toLowerCase()));
  const pick = (meaningful.length ? meaningful : words).slice(0, 2);
  return pick.map((w) => w[0]!.toUpperCase()).join("") || "?";
}
