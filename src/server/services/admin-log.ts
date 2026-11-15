import "server-only";
import type { AdminAction } from "@/lib/admin-log";
import { db } from "@/lib/db";

/**
 * Deja registro de lo que hizo un administrador desde el panel. `summary` es una frase lista para mostrar
 * ("Suspendió la cuenta de Pedro Soto"). Si el registro falla, la acción igual queda hecha.
 */
export async function logAdmin(adminId: string, action: AdminAction, summary: string, targetId?: string) {
  try {
    return await db.adminLog.create({
      data: { adminId, action, summary: summary.slice(0, 300), targetId: targetId ?? null },
    });
  } catch (e) {
    console.error("No se pudo guardar el historial del panel", e);
    return null;
  }
}
