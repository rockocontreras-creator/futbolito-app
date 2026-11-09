import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { db } from "@/lib/db";

// Auth.js v5. Solo se activan los proveedores que tienen sus variables configuradas,
// así un proveedor sin claves no rompe el login con "Server error / Configuration".
export const authProviders = {
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  email: Boolean(process.env.AUTH_RESEND_KEY),
};

const providers: Provider[] = [];
if (authProviders.google) providers.push(Google);
if (authProviders.email) providers.push(Resend({ from: process.env.AUTH_EMAIL_FROM }));

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers,
  trustHost: true,
  pages: { signIn: "/ingresar", verifyRequest: "/ingresar/revisa-tu-correo", error: "/ingresar" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});

/** Solo permite volver a rutas internas después del login. */
export function safeCallbackUrl(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
