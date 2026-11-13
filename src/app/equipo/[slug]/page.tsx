import { ArrowLeft, Crown, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DivisionBadge } from "@/components/features/player/division-badge";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import {
  MakeCaptainButton,
  RequestAnswer,
  TeamMembership,
  type TeamViewer,
} from "@/components/features/team/team-actions";
import { TeamCrest } from "@/components/features/team/team-crest";
import { Container } from "@/components/layout/container";
import { POSITION_LABEL } from "@/lib/labels";
import { getTeamBySlug, type TeamDetail } from "@/server/queries/teams";
import { getCurrentUser, type CurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Equipo" };

export default function TeamPage({ params }: PageProps<"/equipo/[slug]">) {
  return (
    <Suspense fallback={<div className="h-56 chalk-pitch" aria-hidden />}>
      <TeamView params={params} />
    </Suspense>
  );
}

function viewerFor(team: TeamDetail, user: CurrentUser | null): TeamViewer {
  if (!user) return { kind: "anonymous" };
  const me = team.members.find((m) => m.userId === user.id);
  if (me) return { kind: "member", captain: me.role === "CAPTAIN" };
  if (!user.profile) return { kind: "no-profile" };
  if (team.invitations.some((i) => i.senderId === user.id)) return { kind: "requested" };
  return { kind: "can-request" };
}

async function TeamView({ params }: { params: PageProps<"/equipo/[slug]">["params"] }) {
  const { slug } = await params;
  const [team, user] = await Promise.all([getTeamBySlug(decodeURIComponent(slug)), getCurrentUser()]);
  if (!team) notFound();

  const viewer = viewerFor(team, user);
  const isCaptain = viewer.kind === "member" && viewer.captain;
  const record = [
    { label: "Jugados", value: team.matchesPlayed },
    { label: "Ganados", value: team.wins },
    { label: "Empatados", value: team.draws },
    { label: "Perdidos", value: team.losses },
  ];

  return (
    <>
      <section className="chalk-pitch text-white">
        <Container className="space-y-6 py-8 md:py-12">
          <Link
            href="/equipos"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-white/80 hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden /> Equipos
          </Link>
          <div className="flex flex-wrap items-center gap-5">
            <TeamCrest
              name={team.name}
              primary={team.primaryColor}
              secondary={team.secondaryColor}
              className="size-24 drop-shadow-lg"
            />
            <div className="min-w-0 space-y-2">
              <h1 className="text-5xl font-display sm:text-6xl">{team.name}</h1>
              <p className="flex flex-wrap items-center gap-3 text-white/85">
                <DivisionBadge rating={team.rating} showRating />
                <span>
                  {team.comuna.name}
                  {team.sector ? `, ${team.sector.name}` : ""}
                </span>
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Container className="grid gap-6 pt-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-6">
          {isCaptain && team.invitations.length > 0 && (
            <section className="rounded-xl border-2 border-foco bg-card" aria-labelledby="solicitudes">
              <h2 id="solicitudes" className="border-b-2 px-5 py-4 text-lg font-extrabold">
                Quieren unirse ({team.invitations.length})
              </h2>
              <ul className="divide-y-2">
                {team.invitations.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <PlayerAvatar name={r.sender.profile?.displayName ?? "Jugador"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">
                        {r.sender.profile?.displayName ?? "Jugador"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {r.sender.profile ? POSITION_LABEL[r.sender.profile.primaryPosition] : ""}
                      </span>
                    </span>
                    <RequestAnswer requestId={r.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border-2 bg-card" aria-labelledby="plantel">
            <h2 id="plantel" className="flex items-center gap-2 border-b-2 px-5 py-4 text-lg font-extrabold">
              <Users className="size-5 text-primary" aria-hidden /> Plantel
              <span className="text-sm font-normal text-muted-foreground">({team.members.length})</span>
            </h2>
            {team.members.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Este equipo no tiene jugadores.</p>
            ) : (
              <ul className="divide-y-2">
                {team.members.map((m) => {
                  const p = m.user.profile;
                  const name = p?.displayName ?? m.user.name ?? "Jugador";
                  const row = (
                    <>
                      <PlayerAvatar name={name} src={p?.photoUrl ?? m.user.image} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 truncate font-bold">
                          {name}
                          {m.role === "CAPTAIN" && (
                            <Crown className="size-4 text-division-gold" aria-label="Capitán" />
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {p ? POSITION_LABEL[p.primaryPosition] : "Sin perfil"}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                      {p ? (
                        <Link
                          href={`/jugador/${p.username}`}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          {row}
                        </Link>
                      ) : (
                        <span className="flex min-w-0 flex-1 items-center gap-3">{row}</span>
                      )}
                      {isCaptain && m.role !== "CAPTAIN" ? (
                        <MakeCaptainButton teamId={team.id} userId={m.userId} />
                      ) : (
                        p && <DivisionBadge rating={p.rating} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {team.description && (
            <section className="rounded-2xl border-2 bg-card p-5" aria-labelledby="sobre">
              <h2 id="sobre" className="mb-2 text-lg font-extrabold">
                Sobre el equipo
              </h2>
              <p className="text-[15px] whitespace-pre-line text-muted-foreground">{team.description}</p>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border-2 bg-card p-5">
            <TeamMembership teamId={team.id} slug={team.slug} viewer={viewer} />
          </div>
          <dl className="grid grid-cols-4 gap-px overflow-hidden rounded-xl border bg-border text-center">
            {record.map((r) => (
              <div key={r.label} className="bg-card px-2 py-3">
                <dd className="text-3xl font-score">{r.value}</dd>
                <dt className="text-xs text-muted-foreground">{r.label}</dt>
              </div>
            ))}
          </dl>
          <p className="px-1 text-sm text-muted-foreground">
            Los desafíos entre equipos llegan en la próxima fase. El rango del equipo se mueve con ellos.
          </p>
        </aside>
      </Container>
    </>
  );
}
