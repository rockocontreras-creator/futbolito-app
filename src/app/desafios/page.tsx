import { Plus, Swords } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AcceptChallenge, CancelChallenge } from "@/components/features/challenge/challenge-actions";
import { EmptyState } from "@/components/features/empty-state";
import { DivisionBadge } from "@/components/features/player/division-badge";
import { TeamCrest } from "@/components/features/team/team-crest";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { formatMatchDate } from "@/lib/format";
import { listCaptainTeams, listOpenChallenges, type OpenChallenge } from "@/server/queries/challenges";
import { getActiveComuna } from "@/server/queries/zones";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Desafíos" };

export default function ChallengesPage() {
  return (
    <Container className="max-w-3xl pt-8">
      <PageHeader
        title="Desafíos"
        description="Equipos que buscan rival. Si eres capitán, acepta uno o publica el tuyo."
        action={
          <Button asChild>
            <Link href="/desafios/nuevo">
              <Plus aria-hidden /> Buscar rival
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border-2 bg-card" aria-hidden />}>
        <ChallengeList />
      </Suspense>
    </Container>
  );
}

async function ChallengeList() {
  const user = await getCurrentUser();
  const comuna = await getActiveComuna(user?.profile?.comunaId);
  if (!comuna) return null;
  const [challenges, myTeams] = await Promise.all([
    listOpenChallenges(comuna.id),
    user ? listCaptainTeams(user.id) : Promise.resolve([]),
  ]);
  if (challenges.length === 0) {
    return (
      <EmptyState icon={Swords} title="Nadie busca rival todavía">
        Publica el desafío de tu equipo y el primer capitán que lo acepte arma el partido.
      </EmptyState>
    );
  }
  const mine = new Set(myTeams.map((t) => t.id));
  return (
    <ul className="space-y-3">
      {challenges.map((c) => (
        <ChallengeRow key={c.id} c={c} myTeams={myTeams} isMine={mine.has(c.creatorTeam.id)} />
      ))}
    </ul>
  );
}

function ChallengeRow({
  c,
  myTeams,
  isMine,
}: {
  c: OpenChallenge;
  myTeams: { id: string; name: string }[];
  isMine: boolean;
}) {
  // Con cuáles de mis equipos puedo aceptar: no el que publicó y, si es directo, solo el desafiado.
  const canAcceptWith = myTeams.filter(
    (t) => t.id !== c.creatorTeam.id && (!c.targetTeam || c.targetTeam.id === t.id),
  );
  return (
    <li className="space-y-4 rounded-2xl border-2 bg-card p-4">
      <div className="flex items-center gap-4">
        <TeamCrest
          name={c.creatorTeam.name}
          primary={c.creatorTeam.primaryColor}
          secondary={c.creatorTeam.secondaryColor}
          className="size-14"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold">
            <Link href={`/equipo/${c.creatorTeam.slug}`} className="hover:underline">
              {c.creatorTeam.name}
            </Link>{" "}
            <span className="font-bold text-muted-foreground">
              {c.targetTeam ? `desafía a ${c.targetTeam.name}` : "busca rival"}
            </span>
          </h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
            <b className="font-extrabold first-letter:uppercase">{formatMatchDate(c.windowStart)}</b>
            <span className="text-muted-foreground">
              {c.playersPerSide}v{c.playersPerSide} · {c.venue?.name ?? "Cancha a coordinar"}
            </span>
            <DivisionBadge rating={c.creatorTeam.rating} showRating />
          </p>
        </div>
      </div>
      {c.notes && <p className="text-[15px] whitespace-pre-line text-muted-foreground">{c.notes}</p>}
      {isMine ? (
        <CancelChallenge challengeId={c.id} />
      ) : canAcceptWith.length > 0 ? (
        <AcceptChallenge challengeId={c.id} teams={canAcceptWith} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {c.targetTeam
            ? `Solo un capitán de ${c.targetTeam.name} puede aceptarlo.`
            : "Para aceptarlo tienes que ser capitán de un equipo."}
        </p>
      )}
    </li>
  );
}
