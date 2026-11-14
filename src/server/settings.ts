import "server-only";
import { db } from "@/lib/db";

// Valores internos guardados en la base (tabla AppSetting): llaves de los avisos, secreto del reloj, etc.

export async function getSetting(key: string): Promise<string | null> {
  return (await db.appSetting.findUnique({ where: { key } }))?.value ?? null;
}

/** Devuelve el valor guardado o lo crea una sola vez (aunque dos pedidos lleguen a la vez). */
export async function getOrCreateSetting(key: string, create: () => string): Promise<string> {
  const existing = await getSetting(key);
  if (existing !== null) return existing;
  await db.appSetting.createMany({ data: [{ key, value: create() }], skipDuplicates: true });
  return (await getSetting(key))!;
}

/**
 * "Turno" con espera mínima: devuelve true como mucho una vez cada `minutes` (para tareas que se
 * disparan desde las visitas a la página).
 */
export async function claimEvery(key: string, minutes: number): Promise<boolean> {
  const rows = await db.$queryRaw<{ key: string }[]>`
    INSERT INTO "AppSetting" ("key", "value", "updatedAt")
    VALUES (${key}, ${new Date().toISOString()}, now())
    ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = now()
    WHERE "AppSetting"."updatedAt" < now() - make_interval(mins => ${minutes})
    RETURNING "key"`;
  return rows.length > 0;
}
