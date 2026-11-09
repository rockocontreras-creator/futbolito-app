import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileRequired, SignInRequired } from "@/components/features/auth/sign-in-required";
import { ProposeVenueForm } from "@/components/features/venue/propose-venue-form";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { getActiveComuna } from "@/server/queries/zones";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Proponer cancha" };

export default function NewVenuePage() {
  return (
    <Container className="max-w-2xl pt-8">
      <PageHeader
        title="Proponer cancha"
        description="Márcala en el mapa para que todos sepan cómo llegar."
      />
      <Suspense fallback={<div className="h-[640px] animate-pulse rounded-2xl border bg-card" aria-hidden />}>
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
        next="/canchas/nueva"
        title="Ingresa para proponer una cancha"
        text="Así sabemos quién la agregó."
      />
    );
  if (!user.profile) return <ProfileRequired next="/canchas/nueva" />;
  const comuna = await getActiveComuna(user.profile.comunaId);
  return (
    <ProposeVenueForm
      center={
        comuna?.latitude && comuna.longitude ? { lat: comuna.latitude, lng: comuna.longitude } : undefined
      }
    />
  );
}
