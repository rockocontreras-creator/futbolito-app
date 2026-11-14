import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  Banknote,
  Check,
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  Shield,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TeamMatchView } from "@/components/features/challenge/team-match-view";
import { GoingCard, SeriesNote } from "@/components/features/match/going-card";
import { ManageRoster } from "@/components/features/match/manage-roster";
import { MatchChat } from "@/components/features/match/match-chat";
import { ReportResultForm } from "@/components/features/match/report-result-form";
import { ResultVote } from "@/components/features/match/result-panel";
import { ReviewPlayers } from "@/components/features/match/review-players";
import type { RosterPlayer } from "@/components/features/match/roster-types";
import { SlotBar } from "@/components/features/match/slot-bar";
import { TeamsView } from "@/components/features/match/teams-view";
import { WeatherBanner } from "@/components/features/match/weather-banner";
import { VenueMap } from "@/components/features/venue/venue-map";
import { colorName } from "@/lib/colors";
import { directionsUrl } from "@/lib/maps";
import { RosterActions, type ViewerState } from "@/components/features/match/roster-actions";
import { DivisionBadge } from "@/components/features/player/division-badge";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { TIMEZONE } from "@/config/site";
import { formatCLP } from "@/lib/format";
import { MATCH_TYPE_LABEL, POSITION_LABEL, SURFACE_LABEL } from "@/lib/labels";
import { goingWindowOpen } from "@/lib/match-timing";
import { seriesLabel } from "@/lib/series";
import { pickupShareText, whatsappUrl } from "@/lib/share";
import { getTeamMatch } from "@/server/queries/challenges";
import { getMatchDetail, listMyReviews, type MatchDetail } from "@/server/queries/matches";
import { finalizeDueResults } from "@/server/services/finalize-results";
import { getMatchWeather } from "@/server/weather";
import { confirmationsNeeded } from "@/server/services/match-result";
import { getCurrentUser, type CurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Partido" };

export default function MatchPage({ params }: PageProps<"/partidos/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <MatchDetailView params={params} />
    </Suspense>
  );
}

function viewerStateFor(match: MatchDetail, user: CurrentUser | null, now: Date): ViewerState {
  if (!user) return { kind: "anonymous" };
  if (match.organizerId === user.id) return { kind: "organizer" };
  const mine = match.participants.find((p) => p.userId === user.id);
  if (mine?.status === "REGISTERED" || mine?.status === "ATTENDED") return { kind: "registered" };
  if (mine?.status === "WAITLIST") {
    const waitlist = match.participants.filter((p) => p.status === "WAITLIST");
    return { kind: "waitlist", position: waitlist.findIndex((p) => p.userId === user.id) + 1 };
  }
  if (match.status === "CANCELLED") return { kind: "closed", reason: "Partido cancelado" };
  if (!["OPEN", "FULL"].includes(match.status) || match.startsAt <= now) {
    return { kind: "closed", reason: "Inscripciones cerradas" };
  }
  if (!user.profile) return { kind: "no-profile" };
  return { kind: "can-join", full: match.status === "FULL" };
}

async function MatchDetailView({ params }: { params: PageProps<"/partidos/[id]">["params"] }) {
  const { id } = await params;
  // Si el plazo de objeción ya pasó, confirma el resultado antes de mostrarlo.
  await finalizeDueResults(id);
  const [match, user, h] = await Promise.all([getMatchDetail(id), getCurrentUser(), headers()]);
  if (!match) notFound();

  // Partido entre equipos (desafío o liga): tiene su propia página.
  if (match.type !== "PICKUP") {
    const teamMatch = await getTeamMatch(id);
    if (!teamMatch) notFound();
    const teamWeather = ["OPEN", "FULL", "CONFIRMED"].includes(match.status)
      ? await getMatchWeather({
          startsAt: match.startsAt,
          latitude: match.venue?.latitude,
          longitude: match.venue?.longitude,
        }).catch(() => null)
      : null;
    return <TeamMatchView match={teamMatch} user={user} weather={teamWeather} />;
  }

  const now = new Date();
  const players = toRoster(match);
  const isOrganizer = user?.id === match.organizerId;
  const manageable = ["OPEN", "FULL", "CONFIRMED"].includes(match.status);
  const started = match.startsAt <= now;
  const reported = ["PLAYED", "RESULT_CONFIRMED", "DISPUTED"].includes(match.status);
  const me = players.find((p) => p.userId === user?.id);
  const iPlayed = me?.status === "ATTENDED";
  const reviewOpen = reported && iPlayed && now.getTime() < match.startsAt.getTime() + 7 * 86400_000;
  const myReviews = reviewOpen && user ? await listMyReviews(match.id, user.id) : [];
  const goalsOf = new Map(match.goals.map((g) => [g.scorerId, g.count]));
  const mvpId = match.resultReports[0]?.mvpId ?? null;
  const hasSides = players.some((p) => p.side != null);
  const lineup = players.filter((p) => p.status !== "WAITLIST");
  const colors = { A: match.colorA, B: match.colorB };
  const weather =
    reported || match.status === "CANCELLED"
      ? null
      : await getMatchWeather({
          startsAt: match.startsAt,
          latitude: match.venue?.latitude,
          longitude: match.venue?.longitude,
        }).catch(() => null);
  const local = new TZDate(match.startsAt, TIMEZONE);
  const registered = match.participants.filter((p) => p.status === "REGISTERED" || p.status === "ATTENDED");
  const waitlist = match.participants.filter((p) => p.status === "WAITLIST");
  const total = match.maxPlayers ?? match.playersPerSide * 2;
  const missing = total - registered.length;
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const shareText = pickupShareText({
    playersPerSide: match.playersPerSide,
    startsAt: match.startsAt,
    venueName: match.venue?.name ?? null,
    missing,
    url: `${origin}/partidos/${match.id}`,
  });
  // "¿Vas o no vas?": abierto desde 10 horas antes, para los inscritos.
  const goingOpen = goingWindowOpen(match.startsAt, match.status, now);
  const myEntry = match.participants.find((p) => p.userId === user?.id);
  const going = registered.filter((p) => p.goingAt != null);
  const notAnswered = registered.filter((p) => p.goingAt == null);
  const organizerName = match.organizer.profile?.displayName ?? match.organizer.name ?? "Un jugador";
  const ratingRange =
    match.minRating != null || match.maxRating != null
      ? `${match.minRating ?? "Cualquiera"} a ${match.maxRating ?? "cualquiera"}`
      : "Abierto a todos";

  return (
    <>
      <section className="chalk-pitch text-white">
        <Container className="space-y-5 py-8 md:py-12">
          <Link
            href="/partidos"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-white/80 hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden /> Partidos
          </Link>
          <div className="space-y-3">
            <p className="inline-flex rounded-xl bg-foco px-3 py-1 text-sm font-extrabold text-accent-foreground">
              {MATCH_TYPE_LABEL[match.type]} {match.playersPerSide}v{match.playersPerSide}
            </p>
            <h1 className="text-5xl font-display sm:text-6xl">
              {capitalizeFirst(format(local, "EEEE d 'de' MMMM", { locale: es }))}
            </h1>
            <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-lg text-white/85">
              <span className="inline-flex items-center gap-1.5 text-2xl font-score text-white">
                <Clock3 className="size-5" aria-hidden />
                {format(local, "HH:mm")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden /> {match.venue?.name ?? "Cancha a coordinar"}
              </span>
            </p>
            <p
              className="flex flex-wrap items-center gap-2 text-sm font-bold"
              aria-label="Colores de los equipos"
            >
              {(["A", "B"] as const).map((side) => (
                <span
                  key={side}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1"
                >
                  <span
                    className="size-5 rounded-full border border-white/40"
                    style={{ backgroundColor: colors[side] }}
                    aria-hidden
                  />
                  Equipo {side}: {colorName(colors[side])}
                </span>
              ))}
            </p>
          </div>
        </Container>
      </section>

      <Container className="grid gap-6 pt-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-6 lg:order-1">
          {weather && <WeatherBanner weather={weather} />}
          <section className="space-y-4 rounded-2xl border-2 bg-card p-5" aria-labelledby="cupos">
            <div className="flex items-center justify-between">
              <h2 id="cupos" className="text-lg font-extrabold">
                Cupos
              </h2>
              <span className="text-sm text-muted-foreground">Organiza {organizerName}</span>
            </div>
            <SlotBar taken={registered.length} total={total} />
            {goingOpen && (
              <p className="text-[15px]">
                <b className="font-extrabold">
                  Confirmaron que van {going.length} de {registered.length}.
                </b>{" "}
                {isOrganizer && notAnswered.length > 0 && (
                  <span className="text-muted-foreground">
                    Faltan por responder:{" "}
                    {notAnswered
                      .map((p) => p.user.profile?.nickname || p.user.profile?.displayName || p.user.name)
                      .join(", ")}
                    .
                  </span>
                )}
              </p>
            )}
            {match.series && (
              <SeriesNote
                seriesId={match.series.id}
                label={seriesLabel(match.series)}
                active={match.series.isActive}
                canStop={isOrganizer || user?.role === "ADMIN"}
              />
            )}
          </section>

          {reported && match.scoreA != null && match.scoreB != null && (
            <ResultBoard
              scoreA={match.scoreA}
              scoreB={match.scoreB}
              status={match.status}
              confirmations={match.confirmations.length}
              objections={match.objections.length}
              attended={players.filter((p) => p.status === "ATTENDED").length}
            />
          )}

          {isOrganizer && started && (manageable || match.status === "PLAYED") && (
            <ReportResultForm
              matchId={match.id}
              colors={colors}
              players={lineup}
              initial={
                match.status === "PLAYED" && match.scoreA != null && match.scoreB != null
                  ? {
                      scoreA: match.scoreA,
                      scoreB: match.scoreB,
                      goals: Object.fromEntries(goalsOf),
                      mvpId,
                      noShow: players.filter((p) => p.status === "NO_SHOW").map((p) => p.userId),
                    }
                  : undefined
              }
            />
          )}

          {reviewOpen && user && (
            <ReviewPlayers
              matchId={match.id}
              players={players.filter((p) => p.status === "ATTENDED" && p.userId !== user.id)}
              given={myReviews}
            />
          )}

          {isOrganizer && manageable ? (
            <ManageRoster matchId={match.id} players={players} colors={colors} />
          ) : hasSides ? (
            <section className="space-y-3 rounded-2xl border-2 bg-card p-5" aria-labelledby="equipos">
              <h2 id="equipos" className="flex items-center gap-2 text-lg font-extrabold">
                <Users className="size-5 text-primary" aria-hidden /> Equipos
              </h2>
              <TeamsView players={lineup} goalsOf={goalsOf} mvpId={mvpId} colors={colors} />
            </section>
          ) : (
            <section className="rounded-2xl border-2 bg-card" aria-labelledby="jugadores">
              <h2
                id="jugadores"
                className="flex items-center gap-2 border-b-2 px-5 py-4 text-lg font-extrabold"
              >
                <Users className="size-5 text-primary" aria-hidden /> Quiénes van
              </h2>
              <ul className="divide-y-2">
                {registered.map((p) => (
                  <PlayerRow
                    key={p.id}
                    p={p}
                    isOrganizer={p.userId === match.organizerId}
                    going={goingOpen && p.goingAt != null}
                  />
                ))}
              </ul>
            </section>
          )}

          {!(isOrganizer && manageable) && waitlist.length > 0 && (
            <section className="rounded-2xl border-2 bg-card" aria-labelledby="espera">
              <h2 id="espera" className="border-b-2 bg-secondary/50 px-5 py-3 text-sm font-extrabold">
                Lista de espera
              </h2>
              <ul className="divide-y-2">
                {waitlist.map((p) => (
                  <PlayerRow key={p.id} p={p} />
                ))}
              </ul>
            </section>
          )}

          {user &&
          (isOrganizer || (me && ["REGISTERED", "WAITLIST", "ATTENDED", "NO_SHOW"].includes(me.status))) ? (
            <MatchChat matchId={match.id} meId={user.id} canModerate={isOrganizer || user.role === "ADMIN"} />
          ) : (
            <p className="rounded-2xl border-2 border-dashed bg-secondary/40 px-5 py-4 text-sm text-muted-foreground">
              La sala del partido tiene chat. Súmate para hablar con los demás.
            </p>
          )}

          {match.notes && (
            <section className="rounded-2xl border-2 bg-card p-5" aria-labelledby="notas">
              <h2 id="notas" className="mb-2 text-lg font-extrabold">
                Notas del organizador
              </h2>
              <p className="text-[15px] whitespace-pre-line text-muted-foreground">{match.notes}</p>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:order-2">
          <div className="space-y-4 rounded-2xl border-2 bg-card p-5">
            {reported ? (
              <p className="rounded-2xl bg-secondary py-3 text-center text-sm font-extrabold">
                {match.status === "RESULT_CONFIRMED"
                  ? "Partido jugado"
                  : "Partido jugado, resultado en revisión"}
              </p>
            ) : (
              <>
                {goingOpen && myEntry?.status === "REGISTERED" && (
                  <GoingCard matchId={match.id} going={myEntry.goingAt != null} canLeave={!isOrganizer} />
                )}
                <RosterActions matchId={match.id} viewer={viewerStateFor(match, user, now)} />
              </>
            )}
            {match.status === "PLAYED" && iPlayed && !isOrganizer && user && (
              <ResultVote
                matchId={match.id}
                vote={
                  match.confirmations.some((c) => c.userId === user.id)
                    ? "yes"
                    : match.objections.some((o) => o.userId === user.id)
                      ? "no"
                      : null
                }
              />
            )}
            <Button
              asChild
              variant="outline"
              className="w-full border-[#25D366] text-[#128C4B] hover:bg-[#25D366]/10 dark:text-[#5fe08f]"
            >
              <a href={whatsappUrl(shareText)} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden /> Compartir por WhatsApp
              </a>
            </Button>
          </div>
          {match.venue?.latitude != null && match.venue.longitude != null && (
            <div className="space-y-2">
              <VenueMap
                className="h-48"
                zoom={15}
                venues={[
                  {
                    id: match.venue.id,
                    name: match.venue.name,
                    lat: match.venue.latitude,
                    lng: match.venue.longitude,
                  },
                ]}
              />
              <Button asChild variant="outline" className="w-full">
                <a
                  href={directionsUrl(match.venue.latitude, match.venue.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation aria-hidden /> Cómo llegar
                </a>
              </Button>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border text-sm">
            <Detail label="Duración" value={`${match.durationMinutes} min`} icon={Clock3} />
            <Detail
              label="Costo"
              value={match.pricePerPerson ? `${formatCLP(match.pricePerPerson)} c/u` : "Gratis"}
              icon={Banknote}
            />
            <Detail label="Rango" value={ratingRange} icon={Shield} />
            <Detail
              label="Cancha"
              value={match.venue ? SURFACE_LABEL[match.venue.surface] : "A coordinar"}
              icon={MapPin}
            />
          </dl>
        </aside>
      </Container>
    </>
  );
}

function toRoster(match: MatchDetail): RosterPlayer[] {
  return match.participants.map((p) => {
    const profile = p.user.profile;
    return {
      userId: p.userId,
      name: profile?.nickname || profile?.displayName || p.user.name || "Jugador",
      username: profile?.username ?? null,
      photo: profile?.photoUrl ?? p.user.image ?? null,
      rating: profile?.rating ?? null,
      position: profile?.primaryPosition ?? null,
      side: p.side,
      status: p.status as RosterPlayer["status"],
      isOrganizer: p.userId === match.organizerId,
    };
  });
}

function ResultBoard({
  scoreA,
  scoreB,
  status,
  confirmations,
  objections,
  attended,
}: {
  scoreA: number;
  scoreB: number;
  status: string;
  confirmations: number;
  objections: number;
  attended: number;
}) {
  const needed = confirmationsNeeded(attended);
  const note =
    status === "RESULT_CONFIRMED"
      ? "Resultado confirmado. Rangos y estadísticas actualizados."
      : status === "DISPUTED"
        ? "Resultado en disputa: lo revisa un administrador."
        : `Confirmaron ${confirmations} de ${attended}. Cuenta cuando confirmen ${needed}${
            confirmations < needed ? ` (faltan ${needed - confirmations})` : ""
          }.${objections ? ` Dicen que está mal: ${objections}.` : ""}`;
  return (
    <section className="overflow-hidden rounded-2xl border-2 bg-card" aria-labelledby="resultado">
      <h2 id="resultado" className="sr-only">
        Resultado
      </h2>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center chalk-pitch px-5 py-6 text-white">
        <p className="text-center">
          <span className="block text-sm font-extrabold text-white/80">Equipo A</span>
          <span className="text-6xl font-score">{scoreA}</span>
        </p>
        <span className="text-3xl font-score text-white/60">–</span>
        <p className="text-center">
          <span className="block text-sm font-extrabold text-foco">Equipo B</span>
          <span className="text-6xl font-score">{scoreB}</span>
        </p>
      </div>
      <p className="px-5 py-3 text-sm text-muted-foreground">{note}</p>
    </section>
  );
}

/** "lunes 9 de noviembre" → "Lunes 9 de noviembre" (CSS capitalize pondría "De" y "Noviembre"). */
function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Detail({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock3 }) {
  return (
    <div className="space-y-1 bg-card p-4">
      <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

function PlayerRow({
  p,
  isOrganizer = false,
  going = false,
}: {
  p: MatchDetail["participants"][number];
  isOrganizer?: boolean;
  /** Confirmó que va ("¿Vas o no vas?"). */
  going?: boolean;
}) {
  const profile = p.user.profile;
  const name = profile?.nickname || profile?.displayName || p.user.name || "Jugador";
  const content = (
    <>
      <PlayerAvatar name={name} src={profile?.photoUrl ?? p.user.image} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">
          {name}
          {isOrganizer && (
            <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[12px] font-extrabold">
              Organiza
            </span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {profile ? POSITION_LABEL[profile.primaryPosition] : "Sin perfil"}
        </p>
      </div>
      {going && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-0.5 text-sm font-extrabold text-primary">
          <Check className="size-4" aria-hidden strokeWidth={3} /> Va
        </span>
      )}
      {profile && <DivisionBadge rating={profile.rating} />}
    </>
  );
  return (
    <li>
      {profile ? (
        <Link
          href={`/jugador/${profile.username}`}
          className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/50"
        >
          {content}
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-5 py-3">{content}</div>
      )}
    </li>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className="h-56 chalk-pitch" aria-hidden />
      <Container className="grid gap-6 pt-6 lg:grid-cols-[1fr_360px]">
        <div className="h-64 animate-pulse rounded-2xl border-2 bg-card" />
        <div className="h-48 animate-pulse rounded-2xl border-2 bg-card" />
      </Container>
    </>
  );
}
