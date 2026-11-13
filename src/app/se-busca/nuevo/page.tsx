import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileRequired, SignInRequired } from "@/components/features/auth/sign-in-required";
import { RequestForm } from "@/components/features/request/request-form";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { suggestedPickupStart } from "@/lib/dates";
import { listSelectableVenues } from "@/server/queries/venues";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Buscar jugadores" };

export default function NewRequestPage() {
  return (
    <Container className="max-w-2xl pt-8">
      <PageHeader
        title="Buscar jugadores"
        description="Di cuántos faltan y para cuándo. Los que se ofrezcan te aparecen para aceptarlos."
      />
      <Suspense
        fallback={<div className="h-[560px] animate-pulse rounded-2xl border-2 bg-card" aria-hidden />}
      >
        <Gate />
      </Suspense>
    </Container>
  );
}

async function Gate() {
  const user = await getCurrentUser();
  if (!user)
    return (
      <SignInRequired
        next="/se-busca/nuevo"
        title="Ingresa para buscar jugadores"
        text="Así los que se ofrezcan pueden contactarte."
      />
    );
  if (!user.profile) return <ProfileRequired next="/se-busca/nuevo" />;
  const venues = await listSelectableVenues(user.profile.comunaId, user.id);
  return <RequestForm venues={venues} defaultStart={suggestedPickupStart()} />;
}
