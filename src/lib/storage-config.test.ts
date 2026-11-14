import { describe, expect, it } from "vitest";
import { readStorageConfig } from "./storage-config";

const REF = "abcdefghij0123456789";
// Llave de mentira, armada por partes para que el detector de secretos de GitHub no la confunda con una real.
const SECRET = ["sb", "secret", "llave-de-prueba"].join("_");
const jwt = (role: string) => `aaa.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.zzz`;

describe("readStorageConfig", () => {
  it("acepta la dirección base y la llave secreta", () => {
    expect(readStorageConfig(`https://${REF}.supabase.co`, SECRET)).toEqual({
      ok: true,
      url: `https://${REF}.supabase.co`,
      key: SECRET,
    });
  });
  it("arregla direcciones pegadas de otro lado", () => {
    for (const url of [
      `https://${REF}.supabase.co/`,
      `https://${REF}.supabase.co/rest/v1/`,
      `  "https://${REF}.supabase.co"  `,
      `https://supabase.com/dashboard/project/${REF}/settings/api-keys`,
      `postgresql://postgres:clave@db.${REF}.supabase.co:5432/postgres`,
      `postgresql://postgres.${REF}:clave@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
    ]) {
      const c = readStorageConfig(url, SECRET);
      expect(c.ok && c.url, url).toBe(`https://${REF}.supabase.co`);
    }
  });
  it("acepta la llave antigua service_role", () => {
    expect(readStorageConfig(`https://${REF}.supabase.co`, jwt("service_role")).ok).toBe(true);
  });
  it("avisa cuál variable falta", () => {
    const a = readStorageConfig("", SECRET);
    expect(!a.ok && a.missing && a.problem).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
    const b = readStorageConfig(`https://${REF}.supabase.co`, " ");
    expect(!b.ok && b.missing && b.problem).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
  it("rechaza una dirección que no es de Supabase", () => {
    const c = readStorageConfig("https://futbolito-app-six.vercel.app", SECRET);
    expect(!c.ok && c.problem).toMatch(/no es la dirección del proyecto/);
  });
  it("rechaza la llave pública (nueva o antigua)", () => {
    for (const key of ["sb_publishable_abc123", jwt("anon")]) {
      const c = readStorageConfig(`https://${REF}.supabase.co`, key);
      expect(!c.ok && c.problem, key).toMatch(/llave pública/);
    }
  });
  it("rechaza cualquier otra cosa como llave", () => {
    const c = readStorageConfig(`https://${REF}.supabase.co`, "mi-clave-de-la-base");
    expect(!c.ok && c.problem).toMatch(/no parece una llave/);
  });
});
