import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RegisterForm } from "@/components/features/auth/password-forms";
import { BrandMark } from "@/components/layout/brand";
import { Container } from "@/components/layout/container";
import { safeCallbackUrl } from "@/lib/auth";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage({ searchParams }: PageProps<"/registro">) {
  return (
    <Container className="grid min-h-[70vh] place-items-center py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-3 text-center">
          <BrandMark className="mx-auto size-12" />
          <h1 className="text-5xl font-display text-cancha dark:text-white">Crear cuenta</h1>
          <p className="text-muted-foreground">
            Con tu correo y una contraseña. Después eliges tu nombre de usuario en el perfil.
          </p>
        </div>
        <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl border bg-card" aria-hidden />}>
          <RegisterBox searchParams={searchParams} />
        </Suspense>
      </div>
    </Container>
  );
}

async function RegisterBox({ searchParams }: { searchParams: PageProps<"/registro">["searchParams"] }) {
  const sp = await searchParams;
  const callbackUrl = safeCallbackUrl(sp.callbackUrl);
  if (await getCurrentUser()) redirect(callbackUrl);
  // Después de crear la cuenta lo natural es crear el perfil de jugador.
  const next = callbackUrl === "/" ? "/perfil" : `/perfil?volver=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="space-y-5 rounded-2xl border bg-card p-6">
      <RegisterForm callbackUrl={next} />
      <p className="border-t pt-4 text-center text-[15px] text-muted-foreground">
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
    </div>
  );
}
