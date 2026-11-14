import "server-only";
import { createClient } from "@supabase/supabase-js";
import { readStorageConfig } from "@/lib/storage-config";

// Fotos en Supabase Storage (CLAUDE.md §2). Solo el servidor sube, con la llave secreta.
export const AVATAR_BUCKET = "avatars";

/** Falla de configuración o de Supabase, con un mensaje pensado para quien administra. */
export class StorageError extends Error {
  constructor(
    message: string,
    /** true si faltan las variables: la subida de fotos no está activada. */
    readonly notConfigured = false,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export function storageConfig() {
  return readStorageConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function storageConfigured() {
  return storageConfig().ok;
}

function client() {
  const config = storageConfig();
  if (!config.ok) throw new StorageError(config.problem, config.missing);
  return createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Traduce el error de Supabase a algo que se pueda arreglar. */
function explain(step: string, message: string): StorageError {
  if (/invalid api key|invalid jwt|unauthorized|signature|jws|legacy api keys/i.test(message)) {
    return new StorageError(
      `Supabase rechazó la llave (${message}). Revisa que SUPABASE_SERVICE_ROLE_KEY sea la sb_secret_ de este mismo proyecto.`,
    );
  }
  if (/fetch failed|enotfound|getaddrinfo|network/i.test(message)) {
    return new StorageError(
      `No se pudo conectar con Supabase (${message}). Revisa NEXT_PUBLIC_SUPABASE_URL y que el proyecto no esté pausado.`,
    );
  }
  return new StorageError(`Supabase respondió un error al ${step}: ${message}`);
}

let bucketReady: Promise<void> | null = null;
/** Crea el bucket público la primera vez. Si ya existe, sigue; cualquier otro error se informa. */
function ensureBucket() {
  bucketReady ??= (async () => {
    const { error } = await client().storage.createBucket(AVATAR_BUCKET, {
      public: true,
      fileSizeLimit: 3 * 1024 * 1024,
      allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
    });
    if (error && !/already exists|duplicate/i.test(error.message)) {
      throw explain("crear la carpeta de fotos", error.message);
    }
  })().catch((e: unknown) => {
    bucketReady = null; // que el próximo intento vuelva a probar
    throw e instanceof StorageError
      ? e
      : explain("crear la carpeta de fotos", String((e as Error)?.message ?? e));
  });
  return bucketReady;
}

/** Sube la foto y devuelve su URL pública. */
export async function uploadAvatar(userId: string, file: Blob, contentType: string): Promise<string> {
  await ensureBucket();
  const ext = contentType === "image/png" ? "png" : contentType === "image/jpeg" ? "jpg" : "webp";
  const path = `${userId}/${Date.now()}.${ext}`;
  const storage = client().storage.from(AVATAR_BUCKET);
  const { error } = await storage
    .upload(path, file, { contentType, upsert: false, cacheControl: "31536000" })
    .catch((e: unknown) => ({ error: { message: String((e as Error)?.message ?? e) } }));
  if (error) throw explain("subir la foto", error.message);
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
