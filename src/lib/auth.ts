import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { db } from "@/lib/db";
import { dummyHash, verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validations/auth";

// Auth.js v5. Formas de entrar:
// - Correo o usuario + contraseña: siempre disponible.
// - Google y enlace por correo (Resend): solo si sus claves están configuradas, así un proveedor sin
//   claves no rompe el login con "Server error / Configuration".
export const authProviders = {
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  email: Boolean(process.env.AUTH_RESEND_KEY),
};

const providers: Provider[] = [
  Credentials({
    id: "password",
    credentials: { identifier: {}, password: {} },
    async authorize(raw) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { identifier, password } = parsed.data;
      const user = await db.user.findFirst({
        where: {
          deletedAt: null,
          OR: identifier.includes("@") ? [{ email: identifier }] : [{ profile: { username: identifier } }],
        },
      });
      // Compara igual aunque el usuario no exista, para no revelar qué cuentas hay.
      const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
      // Las cuentas con contraseña deben confirmar su correo con el código antes de entrar.
      if (!user || !user.passwordHash || !ok || user.suspendedAt || !user.emailVerified) return null;
      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),
];
// Google confirma que el correo es de quien entra, así que puede entrar a una cuenta ya existente con
// ese mismo correo (por ejemplo la del admin o la de alguien que antes usó contraseña).
if (authProviders.google) providers.push(Google({ allowDangerousEmailAccountLinking: true }));

/** Correos que siempre son admin (variable ADMIN_EMAILS, separados por coma). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
if (authProviders.email) providers.push(Resend({ from: process.env.AUTH_EMAIL_FROM }));

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // JWT: es lo que exige el login con contraseña. Las cuentas de Google igual quedan guardadas por el adaptador.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  providers,
  trustHost: true,
  pages: { signIn: "/ingresar", verifyRequest: "/ingresar/revisa-tu-correo", error: "/ingresar" },
  events: {
    async signIn({ user, account }) {
      if (!user.id) return;
      const email = user.email?.toLowerCase();
      const data: { role?: "ADMIN"; emailVerified?: Date; passwordHash?: null } = {};
      if (email && adminEmails().includes(email)) data.role = "ADMIN";
      if (account?.provider === "google") {
        const current = await db.user.findUnique({ where: { id: user.id }, select: { emailVerified: true } });
        if (!current?.emailVerified) {
          // Si alguien había dejado una contraseña sin confirmar en este correo, deja de servir:
          // el dueño real del correo es quien acaba de entrar con Google.
          data.emailVerified = new Date();
          data.passwordHash = null;
        }
      }
      if (Object.keys(data).length) await db.user.update({ where: { id: user.id }, data });
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

/** Solo permite volver a rutas internas después del login. */
export function safeCallbackUrl(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
