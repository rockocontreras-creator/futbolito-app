import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PasswordSignInForm } from "@/components/features/auth/password-forms";
import { BrandMark } from "@/components/layout/brand";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authProviders, safeCallbackUrl } from "@/lib/auth";
import { signInWithEmail, signInWithGoogle } from "@/server/actions/auth";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Ingresar" };

const ERRORS: Record<string, string> = {
  Configuration: "Esa forma de ingresar no está disponible ahora. Usa tu correo y contraseña.",
  OAuthAccountNotLinked: "Ese correo ya tiene cuenta con contraseña. Ingresa con tu correo y contraseña.",
  CredentialsSignin: "El correo, usuario o contraseña no coinciden.",
  AccessDenied: "No se pudo ingresar con esa cuenta.",
  Verification: "El enlace ya se usó o expiró. Pide uno nuevo.",
};

export default function SignInPage({ searchParams }: PageProps<"/ingresar">) {
  return (
    <Container className="grid min-h-[70vh] place-items-center py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-3 text-center">
          <BrandMark className="mx-auto size-12" />
          <h1 className="text-5xl font-display text-cancha dark:text-white">Ingresar</h1>
          <p className="text-muted-foreground">
            Para sumarte a partidos, publicar revoltijos y tener tu rango.
          </p>
        </div>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl border bg-card" aria-hidden />}>
          <SignInOptions searchParams={searchParams} />
        </Suspense>
      </div>
    </Container>
  );
}

async function SignInOptions({ searchParams }: { searchParams: PageProps<"/ingresar">["searchParams"] }) {
  const sp = await searchParams;
  const callbackUrl = safeCallbackUrl(sp.callbackUrl);
  if (await getCurrentUser()) redirect(callbackUrl);
  const error =
    typeof sp.error === "string" ? (ERRORS[sp.error] ?? "No se pudo ingresar. Inténtalo de nuevo.") : null;
  return (
    <div className="space-y-5 rounded-2xl border bg-card p-6">
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/8 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}
      <PasswordSignInForm callbackUrl={callbackUrl} />

      {(authProviders.google || authProviders.email) && (
        <p className="flex items-center gap-3 text-[13px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
          o
        </p>
      )}
      {authProviders.google && (
        <form action={signInWithGoogle}>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <Button type="submit" variant="outline" size="lg" className="w-full">
            <GoogleIcon /> Continuar con Google
          </Button>
        </form>
      )}
      {authProviders.email && (
        <form action={signInWithEmail} className="space-y-3">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <label htmlFor="magic-email" className="sr-only">
            Correo para recibir el enlace
          </label>
          <Input
            id="magic-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tucorreo@ejemplo.cl"
          />
          <Button type="submit" variant="outline" size="lg" className="w-full">
            Enviarme un enlace para entrar
          </Button>
        </form>
      )}

      <p className="border-t pt-4 text-center text-[15px] text-muted-foreground">
        ¿Primera vez?{" "}
        <Link
          href={
            callbackUrl === "/" ? "/registro" : `/registro?callbackUrl=${encodeURIComponent(callbackUrl)}`
          }
          className="font-bold text-primary underline-offset-4 hover:underline"
        >
          Crea tu cuenta
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"
      />
    </svg>
  );
}
