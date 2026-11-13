// Reglas puras para descartar correos que no pueden ser reales antes de mandar el código.

/** Dominios de correos desechables o de prueba. No es exhaustiva: el código por correo es el filtro real. */
const DISPOSABLE = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "sharklasers.com",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "tempmail.net",
  "tempmailo.com",
  "throwawaymail.com",
  "yopmail.com",
  "yopmail.net",
  "getnada.com",
  "nada.email",
  "trashmail.com",
  "dispostable.com",
  "maildrop.cc",
  "mintemail.com",
  "fakeinbox.com",
  "mohmal.com",
  "emailondeck.com",
  "mail.tm",
  "moakt.com",
  "spamgourmet.com",
  "burnermail.io",
  "inboxkitten.com",
  "mailnesia.com",
  "mytemp.email",
  "tempinbox.com",
  "trbvm.com",
  "discard.email",
  "example.com",
  "example.org",
  "example.net",
  "test.com",
]);

/** Dominios comunes en Chile, para sugerir cuando alguien escribe "gmial.com". */
const COMMON = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "live.cl",
  "hotmail.cl",
  "yahoo.es",
];

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@").pop() ?? "";
}

export function isDisposableDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  if (DISPOSABLE.has(d)) return true;
  // subdominios de los mismos servicios (ej. "abc.mailinator.com")
  for (const bad of DISPOSABLE) if (d.endsWith(`.${bad}`)) return true;
  return false;
}

/** Distancia de edición (inserción, borrado, cambio y letras cruzadas). */
function distance(a: string, b: string): number {
  const w = b.length + 1;
  const d = new Array<number>((a.length + 1) * w).fill(0);
  const at = (i: number, j: number) => d[i * w + j] ?? 0;
  for (let i = 0; i <= a.length; i++) d[i * w] = i;
  for (let j = 0; j <= b.length; j++) d[j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        v = Math.min(v, at(i - 2, j - 2) + 1);
      d[i * w + j] = v;
    }
  }
  return at(a.length, b.length);
}

/** Si el dominio parece un error de tipeo de uno común, devuelve el correo corregido. */
export function suggestEmail(email: string): string | null {
  const domain = emailDomain(email);
  if (!domain || COMMON.includes(domain)) return null;
  const best = COMMON.find((c) => distance(domain, c) <= (c.length > 9 ? 2 : 1));
  return best ? `${email.trim().toLowerCase().slice(0, -domain.length)}${best}` : null;
}

/** Revisión rápida del formato del dominio: al menos un punto y un final de 2+ letras. */
export function plausibleDomain(domain: string): boolean {
  return /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(domain);
}
