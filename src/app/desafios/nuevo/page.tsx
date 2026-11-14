import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProfileRequired, SignInRequired } from "@/components/features/auth/sign-in-required";
import { ChallengeForm } from "@/components/features/challenge/challenge-form";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { suggestedPickupStart } from "@/lib/dates";
import { db } from "@/lib/db";
import { listCaptainTeams } from "@/server/queries/challenges";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Buscar rival" };

export default function NewChallengePage({ searchParams }: PageProps<"/desafios/nuevo">) {
  return (
    <Container className="max-w-2xl pt-8">
      <PageHeader
        title="Buscar rival"
        description="Publica cuándo quiere jugar tu equipo. El capitán que lo acepte arma el partido."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border-2 bg-card" aria-hidden />}>
        <Gate searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Gate({ searchParams }: { searchParams: PageProps<"/desafios/nuevo">["searchParams"] }) {
  const sp = await searchParams;
  const rivalSlug = typeof sp.rival === "string" ? sp.rival : undefined;
  const next = rivalSlug ? `/desafios/nuevo?rival=${encodeURIComponent(rivalSlug)}` : "/desafios/nuevo";
  const user = await getCurrentUser();
  if (!user) {
    return (
      <SignInRequired
        next={next}
        title="Ingresa para desafiar"
        text="Los desafíos los publica el capitán de un equipo."
      />
    );
  }
  if (!user.profile) return <ProfileRequired next={next} />;

  const teams = await listCaptainTeams(user.id);
  if (teams.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl border-2 bg-card p-8 text-center">
        <h2 className="text-2xl font-display">Necesitas ser capitán de un equipo</h2>
        <p className="text-muted-foreground">
          Arma tu equipo (quedas como capitán) o pídele al capitán del tuyo que publique el desafío.
        </p>
        <Button asChild>
          <Link href="/equipos/nuevo">Crear equipo</Link>
        </Button>
      </div>
    );
  }
  const [venues, rival] = await Promise.all([
    db.venue.findMany({
      where: { comunaId: user.profile.comunaId, status: "APPROVED" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    rivalSlug
      ? db.team.findFirst({
          where: { slug: rivalSlug, deletedAt: null },
          select: { slug: true, name: true, id: true },
        })
      : null,
  ]);
  // No tiene sentido desafiar a un equipo con el mismo equipo.
  const usable = rival ? teams.filter((t) => t.id !== rival.id) : teams;
  return (
    <ChallengeForm
      teams={usable.length ? usable : teams}
      venues={venues}
      defaultStart={suggestedPickupStart()}
      rival={rival && usable.length ? { slug: rival.slug, name: rival.name } : undefined}
    />
  );
}
