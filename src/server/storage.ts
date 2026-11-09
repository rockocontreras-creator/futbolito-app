import "server-only";
import { createClient } from "@supabase/supabase-js";

// Fotos en Supabase Storage (CLAUDE.md §2). Solo el servidor sube, con la service role key.
export const AVATAR_BUCKET = "avatars";

export function storageConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

let bucketReady: Promise<void> | null = null;
/** Crea el bucket público la primera vez (si ya existe, Supabase responde error y lo ignoramos). */
function ensureBucket() {
  bucketReady ??= client()
    .storage.createBucket(AVATAR_BUCKET, {
      public: true,
      fileSizeLimit: 3 * 1024 * 1024,
      allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
    })
    .then(() => undefined);
  return bucketReady;
}

/** Sube la foto y devuelve su URL pública. */
export async function uploadAvatar(userId: string, file: Blob, contentType: string): Promise<string> {
  await ensureBucket();
  const ext = contentType === "image/png" ? "png" : contentType === "image/jpeg" ? "jpg" : "webp";
  const path = `${userId}/${Date.now()}.${ext}`;
  const storage = client().storage.from(AVATAR_BUCKET);
  const { error } = await storage.upload(path, file, {
    contentType,
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
  return storage.getPublicUrl(path).data.publicUrl;
}

/** Borra una foto anterior nuestra (si la URL es de nuestro bucket). Errores se ignoran. */
export async function removeAvatarByUrl(url: string | null) {
  if (!url || !storageConfigured()) return;
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return;
  await client()
    .storage.from(AVATAR_BUCKET)
    .remove([url.slice(i + marker.length)])
    .catch(() => undefined);
}
