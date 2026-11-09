import "server-only";
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Contraseñas con scrypt (incluido en Node, sin librerías extra).
// Formato guardado: "scrypt$N$r$p$saltBase64$hashBase64", así se pueden subir los parámetros más adelante
// sin invalidar las contraseñas existentes.

const PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [scheme, n, r, p, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await derive(password, Buffer.from(saltB64, "base64"), { N: +n, r: +r, p: +p });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Hash de relleno para comparar aunque el usuario no exista (evita revelar qué correos están registrados). */
let dummy: Promise<string> | null = null;
export function dummyHash() {
  dummy ??= hashPassword("contraseña-de-relleno");
  return dummy;
}
