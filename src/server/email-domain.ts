import "server-only";
import { promises as dns } from "node:dns";
import { isDisposableDomain, plausibleDomain } from "@/lib/email-check";

const cache = new Map<string, boolean>();
const NOT_FOUND = new Set(["ENOTFOUND", "ENODATA", "ENONAME", "NXDOMAIN"]);

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), ms))]);
}

/** ¿Existe el dominio y puede recibir correo? Si el DNS falla por otra razón, se deja pasar (el código decide). */
async function receivesMail(domain: string): Promise<boolean> {
  try {
    const mx = await withTimeout(dns.resolveMx(domain), 4000);
    if (mx.some((r) => r.exchange && r.exchange !== ".")) return true;
    return false; // MX nulo: el dominio declara que no recibe correo
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "";
    if (!NOT_FOUND.has(code)) return true;
  }
  // Sin MX, el correo puede ir al registro A/AAAA del dominio.
  try {
    const a = await withTimeout(dns.resolve(domain), 4000);
    return a.length > 0;
  } catch (e) {
    return !NOT_FOUND.has((e as NodeJS.ErrnoException).code ?? "");
  }
}

/** Si ni siquiera gmail.com resuelve, el problema es el DNS del servidor y no el correo. */
let dnsWorks: Promise<boolean> | null = null;
function dnsIsWorking(): Promise<boolean> {
  dnsWorks ??= withTimeout(dns.resolveMx("gmail.com"), 4000).then(
    (r) => r.length > 0,
    () => false,
  );
  return dnsWorks;
}

export type DomainCheck = "ok" | "invalid" | "disposable";

export async function checkEmailDomain(domain: string): Promise<DomainCheck> {
  if (!plausibleDomain(domain)) return "invalid";
  if (isDisposableDomain(domain)) return "disposable";
  if (!cache.has(domain)) {
    const ok = await receivesMail(domain);
    if (!ok && !(await dnsIsWorking())) {
      dnsWorks = null; // se vuelve a probar la próxima vez
      return "ok";
    }
    cache.set(domain, ok);
  }
  return cache.get(domain) ? "ok" : "invalid";
}
