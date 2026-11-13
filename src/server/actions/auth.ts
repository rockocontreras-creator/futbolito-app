"use server";

import { AuthError } from "next-auth";
import { safeCallbackUrl, signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailDomain } from "@/lib/email-check";
import { hashPassword, verifyPassword } from "@/lib/password";
import { confirmEmailSchema, loginSchema, registerSchema } from "@/lib/validations/auth";
import type { ActionResult } from "@/server/action-result";
import { checkEmailDomain } from "@/server/email-domain";
import { checkEmailCode, sendEmailCode } from "@/server/services/email-code";
import { z } from "zod";

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: safeCallbackUrl(formData.get("callbackUrl")) });
}

export async function signInWithEmail(formData: FormData) {
  await signIn("resend", {
    email: String(formData.get("email") ?? ""),
    redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

type Fail = Extract<ActionResult<never>, { ok: false }>;
/** Si sale bien, la acción redirige; si falta confirmar el correo, devuelve a qué correo se mandó el código. */
export type AuthFormResult = Fail | { ok: true; data: { verifyEmail: string; notice: string | null } };

function invalid(error: z.ZodError): Fail {
  return { ok: false, error: "Revisa los campos marcados.", fieldErrors: z.flattenError(error).fieldErrors };
}

async function signInOrError(identifier: string, password: string, callbackUrl: unknown): Promise<Fail> {
  try {
    await signIn("password", { identifier, password, redirectTo: safeCallbackUrl(callbackUrl) });
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: "El correo, usuario o contraseña no coinciden." };
    throw e;
  }
  return { ok: false, error: "No se pudo ingresar. Inténtalo de nuevo." };
}

/**
 * Entrar con correo o usuario + contraseña. Si sale bien, signIn redirige (lanza el redirect de Next,
 * que no hay que atrapar). Si la cuenta no confirmó su correo, manda un código y lo avisa.
 */
export async function signInWithPassword(input: unknown, callbackUrl: unknown): Promise<AuthFormResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { identifier, password } = parsed.data;

  const pending = await db.user.findFirst({
    where: {
      deletedAt: null,
      emailVerified: null,
      passwordHash: { not: null },
      OR: identifier.includes("@") ? [{ email: identifier }] : [{ profile: { username: identifier } }],
    },
    select: { email: true, name: true, passwordHash: true },
  });
  if (pending?.email && pending.passwordHash && (await verifyPassword(password, pending.passwordHash))) {
    const sent = await sendEmailCode(pending.email, pending.name);
    return {
      ok: true,
      data: { verifyEmail: pending.email, notice: sent.ok ? null : sent.error },
    };
  }
  return signInOrError(identifier, password, callbackUrl);
}

const DOMAIN_ERROR = {
  invalid: "Ese correo no existe. Revisa que esté bien escrito.",
  disposable: "No se aceptan correos temporales. Usa tu correo de siempre.",
} as const;

/** Crear cuenta con correo y contraseña. Deja la cuenta pendiente y manda un código al correo. */
export async function registerWithPassword(input: unknown): Promise<AuthFormResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { name, email, password } = parsed.data;

  const domain = await checkEmailDomain(emailDomain(email));
  if (domain !== "ok") {
    const msg = DOMAIN_ERROR[domain];
    return { ok: false, error: msg, fieldErrors: { email: [msg] } };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing?.emailVerified && existing.passwordHash) {
    const msg = "Ese correo ya tiene cuenta. Ingresa con tu contraseña.";
    return { ok: false, error: msg, fieldErrors: { email: [msg] } };
  }
  if (existing && !existing.passwordHash) {
    const msg = "Ese correo ya entró con Google. Usa “Continuar con Google”.";
    return { ok: false, error: msg, fieldErrors: { email: [msg] } };
  }

  // Si había un registro sin confirmar con este correo, se reemplaza: solo vale el que confirme el código.
  const passwordHash = await hashPassword(password);
  if (existing) await db.user.update({ where: { id: existing.id }, data: { name, passwordHash } });
  else await db.user.create({ data: { name, email, passwordHash } });

  const sent = await sendEmailCode(email, name);
  if (!sent.ok && !sent.error.startsWith("Espera")) return { ok: false, error: sent.error };
  return { ok: true, data: { verifyEmail: email, notice: sent.ok ? null : sent.error } };
}

/** Revisa el código del correo, deja la cuenta confirmada y entra. */
export async function confirmEmailAndSignIn(input: unknown, callbackUrl: unknown): Promise<AuthFormResult> {
  const parsed = confirmEmailSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { email, code, password } = parsed.data;

  const state = await checkEmailCode(email, code);
  if (state !== "ok") {
    const msg = {
      wrong: "El código no coincide. Revisa el último correo que te llegó.",
      expired: "El código venció. Pide uno nuevo.",
      locked: "Demasiados intentos. Pide un código nuevo.",
      missing: "Pide un código nuevo.",
    }[state];
    return { ok: false, error: msg, fieldErrors: { code: [msg] } };
  }
  await db.user.updateMany({ where: { email, emailVerified: null }, data: { emailVerified: new Date() } });
  return signInOrError(email, password, callbackUrl);
}

/** Mandar otro código a una cuenta que todavía no confirma su correo. */
export async function resendEmailCode(input: unknown): Promise<ActionResult<null>> {
  const parsed = z.object({ email: z.email().trim().toLowerCase() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Correo inválido." };
  const user = await db.user.findFirst({
    where: { email: parsed.data.email, emailVerified: null, passwordHash: { not: null }, deletedAt: null },
    select: { name: true },
  });
  // Misma respuesta exista o no la cuenta, para no revelar qué correos están registrados.
  if (!user) return { ok: true, data: null };
  const sent = await sendEmailCode(parsed.data.email, user.name);
  return sent.ok ? { ok: true, data: null } : sent;
}
