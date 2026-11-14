// Revisa la configuración de Supabase Storage antes de usarla, para dar un error claro
// (la dirección o la llave equivocada en Vercel es la causa típica de que no suban las fotos).

export type StorageConfig =
  { ok: true; url: string; key: string } | { ok: false; problem: string; missing?: boolean };

const clean = (v: string | undefined) => (v ?? "").trim().replace(/^["']|["']$/g, "");

/** El "ref" del proyecto son 20 letras/números; aparece en todas las direcciones de Supabase. */
function projectRef(value: string): string | null {
  const m =
    /(?:https?:\/\/|@|\/\/)?(?:db\.)?([a-z0-9]{20})\.supabase\.co/i.exec(value) ??
    /supabase\.com\/dashboard\/project\/([a-z0-9]{20})/i.exec(value) ??
    /postgres\.([a-z0-9]{20})[:@]/i.exec(value);
  return m?.[1]?.toLowerCase() ?? null;
}

/** Rol que declara una llave antigua (JWT), sin verificar la firma. */
function legacyRole(key: string): string | null {
  const payload = key.split(".");
  if (payload.length !== 3 || !payload[1]) return null;
  try {
    const json = Buffer.from(payload[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const role = (JSON.parse(json) as { role?: unknown }).role;
    return typeof role === "string" ? role : null;
  } catch {
    return null;
  }
}

/**
 * Deja la dirección en su forma base (https://<ref>.supabase.co) aunque en Vercel hayan pegado la del
 * panel, la de la base de datos o una con /rest/v1 al final, y revisa que la llave sea la secreta.
 */
export function readStorageConfig(rawUrl: string | undefined, rawKey: string | undefined): StorageConfig {
  const urlValue = clean(rawUrl);
  const key = clean(rawKey);
  if (!urlValue || !key) {
    return {
      ok: false,
      missing: true,
      problem: `Falta ${!urlValue ? "NEXT_PUBLIC_SUPABASE_URL" : "SUPABASE_SERVICE_ROLE_KEY"} en Vercel.`,
    };
  }
  const ref = projectRef(urlValue);
  if (!ref) {
    return {
      ok: false,
      problem:
        "NEXT_PUBLIC_SUPABASE_URL no es la dirección del proyecto. Tiene que ser como https://abcdefghijklmnopqrst.supabase.co",
    };
  }
  if (key.startsWith("sb_publishable_") || legacyRole(key) === "anon") {
    return {
      ok: false,
      problem:
        "SUPABASE_SERVICE_ROLE_KEY tiene la llave pública. Va la secreta: la que empieza con sb_secret_ (o la service_role).",
    };
  }
  if (!key.startsWith("sb_secret_") && legacyRole(key) !== "service_role") {
    return {
      ok: false,
      problem:
        "SUPABASE_SERVICE_ROLE_KEY no parece una llave de Supabase. Copia de nuevo la que empieza con sb_secret_.",
    };
  }
  return { ok: true, url: `https://${ref}.supabase.co`, key };
}
