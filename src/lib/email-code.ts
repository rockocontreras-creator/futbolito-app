// Reglas del código de confirmación de correo (puras, con tests).

export const CODE_TTL_MS = 15 * 60_000;
export const CODE_MAX_ATTEMPTS = 5;
export const CODE_RESEND_MS = 60_000;
export const CODE_MAX_PER_HOUR = 5;

export type ResendCheck = { ok: true } | { ok: false; waitSeconds: number; reason: "cooldown" | "hourly" };

/** ¿Se puede mandar otro código? `recent` = fechas de los códigos enviados en la última hora. */
export function canSendCode(recent: Date[], now: Date = new Date()): ResendCheck {
  const inHour = recent
    .filter((d) => now.getTime() - d.getTime() < 3_600_000)
    .sort((a, b) => b.getTime() - a.getTime());
  const last = inHour[0];
  if (last && now.getTime() - last.getTime() < CODE_RESEND_MS) {
    return {
      ok: false,
      reason: "cooldown",
      waitSeconds: Math.ceil((CODE_RESEND_MS - (now.getTime() - last.getTime())) / 1000),
    };
  }
  const oldest = inHour[inHour.length - 1];
  if (oldest && inHour.length >= CODE_MAX_PER_HOUR) {
    return {
      ok: false,
      reason: "hourly",
      waitSeconds: Math.ceil((3_600_000 - (now.getTime() - oldest.getTime())) / 1000),
    };
  }
  return { ok: true };
}

export type CodeState = "ok" | "wrong" | "expired" | "locked" | "missing";

export function codeState(
  code: { expiresAt: Date; attempts: number } | null,
  matches: boolean,
  now: Date = new Date(),
): CodeState {
  if (!code) return "missing";
  if (code.expiresAt.getTime() <= now.getTime()) return "expired";
  if (code.attempts >= CODE_MAX_ATTEMPTS) return "locked";
  return matches ? "ok" : "wrong";
}

/** Normaliza lo que escribe la persona: solo los dígitos ("123 456" → "123456"). */
export function cleanCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, 6);
}
