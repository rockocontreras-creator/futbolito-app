import "server-only";
import { DEFAULT_COMUNA_SLUG } from "@/config/site";
import { db } from "@/lib/db";

/** Comuna por defecto (San Clemente) o la del usuario si tiene perfil. */
export async function getActiveComuna(comunaId?: string | null) {
  if (comunaId) {
    const own = await db.comuna.findFirst({ where: { id: comunaId, isActive: true } });
    if (own) return own;
  }
  return db.comuna.findFirst({ where: { slug: DEFAULT_COMUNA_SLUG } });
}

export function listActiveComunas() {
  return db.comuna.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { region: true },
  });
}

export function listSectors(comunaId: string) {
  return db.sector.findMany({ where: { comunaId, isActive: true }, orderBy: { name: "asc" } });
}
