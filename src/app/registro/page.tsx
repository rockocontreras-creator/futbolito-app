import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RegisterForm } from "@/components/features/auth/password-forms";
import { AuthShell, GoogleButton, OrDivider } from "@/components/features/auth/auth-shell";
import { authProviders, safeCallbackUrl } from "@/lib/auth";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage({ searchParams }: PageProps<"/registro">) {
  return (
    <AuthShell
      title="Crear cuenta"
      intro="Con Google en un toque, o con tu correo y una contraseña. Después eliges tu usuario en el perfil."
    >
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-secondary" aria-hidden />}>
        <RegisterBox searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function RegisterBox({ searchParams }: { searchParams: PageProps<"/registro">["searchParams"] }) {
  const sp = await searchParams;
  const callbackUrl = safeCallbackUrl(sp.callbackUrl);
  if (await getCurrentUser()) redirect(callbackUrl);
  // Después de crear la cuenta lo natural es crear el perfil de jugador.
  const next = callbackUrl === "/" ? "/perfil" : `/perfil?volver=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="space-y-6">
      {authProviders.google && (
        <>
          <GoogleButton callbackUrl={next} />
          <OrDivider />
        </>
      )}
      <RegisterForm callbackUrl={next} />
      <p className="text-[15px] text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={
            callbackUrl === "/" ? "/ingresar" : `/ingresar?callbackUrl=${encodeURIComponent(callbackUrl)}`
          }
          className="font-bold text-primary underline-offset-4 hover:underline"
        >
          Ingresa
        </Link>
      </p>
      <p className="text-[13px] text-muted-foreground">
        Al crear tu cuenta aceptas los{" "}
        <Link href="/terminos" className="underline underline-offset-4 hover:text-foreground">
          Términos de uso
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" className="underline underline-offset-4 hover:text-foreground">
          Privacidad
        </Link>
        .
      </p>
    </div>
  );
}
