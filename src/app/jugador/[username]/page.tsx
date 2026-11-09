import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProfileView } from "@/components/features/player/profile-view";
import { Container } from "@/components/layout/container";
import { getPublicProfile } from "@/server/queries/players";

export const metadata: Metadata = { title: "Jugador" };

export default function PlayerPage({ params }: PageProps<"/jugador/[username]">) {
  return (
    <Container className="max-w-4xl pt-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border bg-card" aria-hidden />}>
        <PublicProfile params={params} />
      </Suspense>
    </Container>
  );
}

async function PublicProfile({ params }: { params: PageProps<"/jugador/[username]">["params"] }) {
  const { username } = await params;
  const profile = await getPublicProfile(decodeURIComponent(username));
  if (!profile) notFound();
  return <ProfileView profile={profile} />;
}
