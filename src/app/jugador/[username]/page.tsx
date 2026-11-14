import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlayerCommunity } from "@/components/features/player/player-community";
import { ProfileView } from "@/components/features/player/profile-view";
import { ReportPlayer } from "@/components/features/player/report-player";
import { Container } from "@/components/layout/container";
import { getPlayerCommunity, getPublicProfile } from "@/server/queries/players";
import { finalizeDueResults } from "@/server/services/finalize-results";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Jugador" };

export default function PlayerPage({ params }: PageProps<"/jugador/[username]">) {
  return (
    <Container className="max-w-4xl pt-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border-2 bg-card" aria-hidden />}>
        <PublicProfile params={params} />
      </Suspense>
    </Container>
  );
}

async function PublicProfile({ params }: { params: PageProps<"/jugador/[username]">["params"] }) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  await finalizeDueResults();
  const profile = await getPublicProfile(decodeURIComponent(username));
  if (!profile) notFound();
  const community = await getPlayerCommunity(profile.userId);
  return (
    <div className="space-y-8">
      <ProfileView profile={profile} reviews={community.reviews} />
      <PlayerCommunity
        profile={profile}
        community={community}
        viewer={{
          userId: viewer?.id ?? null,
          hasProfile: Boolean(viewer?.profile),
          isAdmin: viewer?.role === "ADMIN",
        }}
      />
      {viewer?.profile && viewer.id !== profile.userId && (
        <ReportPlayer username={profile.username} name={profile.nickname || profile.displayName} />
      )}
    </div>
  );
}
