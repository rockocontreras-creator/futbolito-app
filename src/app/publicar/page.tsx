import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileRequired, SignInRequired } from "@/components/features/auth/sign-in-required";
import { PublishPickupForm } from "@/components/features/match/publish-pickup-form";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { suggestedPickupStart } from "@/lib/dates";
import { db } from "@/lib/db";
import { listSelectableVenues } from "@/server/queries/venues";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Publicar revoltijo" };

export default function PublishPage() {
  return (
    <Container className="max-w-3xl pt-8">
      <PageHeader
        title="Publicar revoltijo"
        description="Pon cancha, día y cuántos faltan. Después compártelo por WhatsApp y el resto se suma solo."
      />
      <Suspense fallback={<div className="h-[640px] animate-pulse rounded-2xl border bg-card" aria-hidden />}>
        <PublishGate />
      </Suspense>
    </Container>
  );
}

async function PublishGate() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <SignInRequired
        next="/publicar"
        title="Ingresa para publicar"
        text="Así los jugadores saben quién organiza y te llegan los avisos cuando alguien se suma."
      />
    );
  }
  if (!user.profile) return <ProfileRequired next="/publicar" />;

  const [venues, comuna] = await Promise.all([
    listSelectableVenues(user.profile.comunaId, user.id),
    db.comuna.findUnique({ where: { id: user.profile.comunaId } }),
  ]);
  return (
    <PublishPickupForm
      venues={venues}
      defaultStart={suggestedPickupStart()}
      center={
        comuna?.latitude && comuna.longitude ? { lat: comuna.latitude, lng: comuna.longitude } : undefined
      }
    />
  );
}
