import "server-only";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Usuario actual (o null) con su perfil de jugador. Para lecturas en páginas. */
export async function getCurrentUser() {
  // Auth.js usa crypto al leer la sesión: marcamos el render como de request antes de llamarlo.
  await connection();
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return db.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { profile: true },
  });
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
