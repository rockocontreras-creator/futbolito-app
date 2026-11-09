import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileRequired, SignInRequired } from "@/components/features/auth/sign-in-required";
import { TeamForm } from "@/components/features/team/team-form";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Crear equipo" };

export default function NewTeamPage() {
  return (
    <Container className="max-w-3xl pt-8">
      <PageHeader
        title="Crear equipo"
        description="Nombre y colores. Después tus compañeros piden unirse desde la página del equipo."
      />
      <Suspense fallback={<div className="h-[520px] animate-pulse rounded-2xl border bg-card" aria-hidden />}>
        <NewTeamGate />
      </Suspense>
    </Container>
  );
}

async function NewTeamGate() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <SignInRequired
        next="/equipos/nuevo"
        title="Ingresa para crear tu equipo"
        text="El equipo queda a tu nombre como capitán."
      />
    );
  }
  if (!user.profile) return <ProfileRequired next="/equipos/nuevo" />;
  return <TeamForm />;
}
