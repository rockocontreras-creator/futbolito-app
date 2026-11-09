"use server";

import { AuthError } from "next-auth";
import { safeCallbackUrl, signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import type { ActionResult } from "@/server/action-result";
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

/**
 * Entrar con correo o usuario + contraseña. Si sale bien, signIn redirige (lanza el redirect de Next,
 * que no hay que atrapar). Si falla, devuelve el error para mostrarlo en el formulario.
 */
export async function signInWithPassword(input: unknown, callbackUrl: unknown): Promise<Fail> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  try {
    await signIn("password", { ...parsed.data, redirectTo: safeCallbackUrl(callbackUrl) });
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: "El correo, usuario o contraseña no coinciden." };
    }
    throw e;
  }
  return { ok: false, error: "No se pudo ingresar. Inténtalo de nuevo." };
}

/** Crear cuenta con correo y contraseña, y entrar de inmediato. */
export async function registerWithPassword(input: unknown, callbackUrl: unknown): Promise<Fail> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    const msg = existing.passwordHash
      ? "Ese correo ya tiene cuenta. Ingresa con tu contraseña."
      : "Ese correo ya entró con Google. Usa “Continuar con Google”.";
    return { ok: false, error: msg, fieldErrors: { email: [msg] } };
  }

  await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });

  try {
    await signIn("password", { identifier: email, password, redirectTo: safeCallbackUrl(callbackUrl) });
  } catch (e) {
    if (e instanceof AuthError)
      return { ok: false, error: "Tu cuenta se creó, pero no pudimos entrar. Ingresa de nuevo." };
    throw e;
  }
  return { ok: false, error: "No se pudo ingresar. Inténtalo de nuevo." };
}
