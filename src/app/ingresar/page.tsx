import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell, GoogleButton, OrDivider } from "@/components/features/auth/auth-shell";
import { PasswordSignInForm } from "@/components/features/auth/password-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authProviders, safeCallbackUrl } from "@/lib/auth";
import { signInWithEmail } from "@/server/actions/auth";
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
    <AuthShell title="Ingresar" intro="Para sumarte a partidos, publicar revoltijos y tener tu rango.">
      <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-secondary" aria-hidden />}>
        <SignInOptions searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function SignInOptions({ searchParams }: { searchParams: PageProps<"/ingresar">["searchParams"] }) {
  const sp = await searchParams;
  const callbackUrl = safeCallbackUrl(sp.callbackUrl);
  if (await getCurrentUser()) redirect(callbackUrl);
  const error =
    typeof sp.error === "string" ? (ERRORS[sp.error] ?? "No se pudo ingresar. Inténtalo de nuevo.") : null;
  return (
    <div className="space-y-6">
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/8 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}
      {authProviders.google && (
        <>
          <GoogleButton callbackUrl={callbackUrl} />
          <OrDivider />
        </>
      )}
      <PasswordSignInForm callbackUrl={callbackUrl} />

      {authProviders.email && (
        <form action={signInWithEmail} className="space-y-3 border-t pt-6">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <label htmlFor="magic-email" className="text-sm font-semibold">
            ¿Sin contraseña? Te mandamos un enlace para entrar
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
            Enviarme el enlace
          </Button>
        </form>
      )}

      <p className="text-[15px] text-muted-foreground">
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
