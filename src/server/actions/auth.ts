"use server";

import { safeCallbackUrl, signIn, signOut } from "@/lib/auth";

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
