"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { sniffImageType } from "@/lib/image-type";
import { AuthError, requireUser } from "@/server/permissions";
import { getCurrentUser } from "@/server/session";
import { removeAvatarByUrl, StorageError, uploadAvatar } from "@/server/storage";

const MAX_BYTES = 2.5 * 1024 * 1024;

type Result = { ok: true; data: { url: string | null } } | { ok: false; error: string };

/** Sube o cambia la foto de perfil. El navegador ya la recortó a cuadrado y la achicó. */
export async function uploadProfilePhoto(formData: FormData): Promise<Result> {
  try {
    const user = await requireUser();
    const profile = await db.playerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new AuthError("Primero crea tu perfil de jugador.");
    const file = formData.get("photo");
    if (!(file instanceof Blob) || file.size === 0) throw new AuthError("Elige una foto.");
    if (file.size > MAX_BYTES) throw new AuthError("La foto pesa demasiado (máximo 2,5 MB).");
    const type = sniffImageType(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
    if (!type) throw new AuthError("Ese archivo no es una foto JPG, PNG o WebP.");

    const url = await uploadAvatar(user.id, file, type);
    await db.playerProfile.update({ where: { id: profile.id }, data: { photoUrl: url } });
    await removeAvatarByUrl(profile.photoUrl);
    refresh();
    return { ok: true, data: { url } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    console.error("[fotos]", e);
    if (e instanceof StorageError) {
      // Al admin se le muestra la causa para que pueda arreglarla; al resto, un mensaje simple.
      const isAdmin = (await getCurrentUser().catch(() => null))?.role === "ADMIN";
      if (isAdmin) return { ok: false, error: e.message };
      return {
        ok: false,
        error: e.notConfigured
          ? "La subida de fotos todavía no está activada. Avísale al administrador."
          : "La subida de fotos está fallando. Avísale al administrador.",
      };
    }
    return { ok: false, error: "No se pudo subir la foto. Inténtalo de nuevo." };
  }
}

/** Quita la foto de perfil (vuelven las iniciales). */
export async function removeProfilePhoto(): Promise<Result> {
  try {
    const user = await requireUser();
    const profile = await db.playerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new AuthError("Primero crea tu perfil de jugador.");
    await db.playerProfile.update({ where: { id: profile.id }, data: { photoUrl: null } });
    await removeAvatarByUrl(profile.photoUrl);
    refresh();
    return { ok: true, data: { url: null } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "No se pudo quitar la foto." };
  }
}
