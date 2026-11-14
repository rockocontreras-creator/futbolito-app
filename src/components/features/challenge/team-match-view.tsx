import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Check, Clock3, Crown, MapPin, Navigation } from "lucide-react";
import Link from "next/link";
import { TeamResultForm } from "@/components/features/challenge/team-result-form";
import { MatchChat } from "@/components/features/match/match-chat";
import { WeatherBanner } from "@/components/features/match/weather-banner";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { TeamCrest } from "@/components/features/team/team-crest";
import { VenueMap } from "@/components/features/venue/venue-map";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { TIMEZONE } from "@/config/site";
import { MATCH_TYPE_LABEL } from "@/lib/labels";
import { directionsUrl } from "@/lib/maps";
import type { TeamMatch } from "@/server/queries/challenges";
import type { CurrentUser } from "@/server/session";
import type { MatchWeather } from "@/server/weather";

type Team = NonNullable<TeamMatch["homeTeam"]>;
const memberName = (m: Team["members"][number]) =>
  m.user.profile?.nickname || m.user.profile?.displayName || m.user.name || "Jugador";

/** Página de un partido entre equipos (desafío o liga). */
export function TeamMatchView({
  match,
  user,
  weather,
}: {
  match: TeamMatch;
  user: CurrentUser | null;
  weather: MatchWeather | null;
}) {
  const home = match.homeTeam;
  const away = match.awayTeam;
  if (!home || !away) return null;

  const now = new Date();
  const local = new TZDate(match.startsAt, TIMEZONE);
  const started = match.startsAt <= now;
  const confirmed = match.status === "RESULT_CONFIRMED";
  const cancelled = match.status === "CANCELLED";
  const captainOf = [home, away].find((t) =>
    t.members.some((m) => m.userId === user?.id && m.role === "CAPTAIN"),
  );
  const isMember = [home, away].some((t) => t.members.some((m) => m.userId === user?.id));
  const reportOf = (side: "A" | "B") => {
    const r = match.resultReports.find((x) => x.side === side);
    return r ? { home: r.scoreA, away: r.scoreB } : null;
  };
  const mySide = captainOf ? (captainOf.id === home.id ? "A" : "B") : null;
  const mine = mySide ? reportOf(mySide) : null;
  const theirs = mySide ? reportOf(mySide === "A" ? "B" : "A") : null;
  const played = new Set(match.participants.map((p) => p.userId));
  const showScore = match.scoreA != null && match.scoreB != null && (confirmed || match.status === "PLAYED");
  const canReport =
    Boolean(captainOf) && started && ["CONFIRMED", "PLAYED", "DISPUTED"].includes(match.status);

  let status: string;
  if (cancelled) status = "Partido anulado.";
  else if (confirmed) status = "Resultado confirmado por los dos capitanes. Ya se movió el rango.";
  else if (match.status === "DISPUTED")
    status = "Los capitanes reportaron marcadores distintos. Lo va a resolver un administrador.";
  else if (match.status === "PLAYED")
    status = "Un capitán ya reportó. Falta que el otro confirme el marcador.";
  else if (started) status = "Partido jugado. Falta que los capitanes reporten el resultado.";
  else status = "Partido confirmado. Coordinen los detalles en la sala.";

  return (
    <>
      <section className="chalk-pitch text-white">
        <Container className="space-y-6 py-8 md:py-12">
          <Link
            href="/partidos"
            className="flex w-fit items-center gap-1.5 text-sm font-bold text-white/80 hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden /> Partidos
          </Link>
          <p className="mx-auto w-fit rounded-xl bg-foco px-3 py-1 text-sm font-extrabold text-accent-foreground">
            {MATCH_TYPE_LABEL[match.type]} {match.playersPerSide}v{match.playersPerSide}
          </p>
          <h1 className="sr-only">
            {home.name} contra {away.name}
          </h1>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <TeamHead team={home} />
            <p className="text-center font-score" aria-label={showScore ? "Marcador" : undefined}>
              {showScore ? (
                <span className="text-5xl sm:text-7xl">
                  {match.scoreA}–{match.scoreB}
                </span>
              ) : (
                <span className="text-3xl text-white/70 sm:text-4xl">vs</span>
              )}
            </p>
            <TeamHead team={away} />
          </div>
          <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-lg text-white/90">
            <span className="first-letter:uppercase">
              {format(local, "EEEE d 'de' MMMM", { locale: es })}
            </span>
            <span className="inline-flex items-center gap-1.5 text-2xl font-score text-white">
              <Clock3 className="size-5" aria-hidden />
              {format(local, "HH:mm")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden /> {match.venue?.name ?? "Cancha a coordinar"}
            </span>
          </p>
        </Container>
      </section>

      <Container className="grid gap-6 pt-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-6">
          {weather && !started && <WeatherBanner weather={weather} />}
          <p className="rounded-2xl bg-secondary px-5 py-4 text-[15px] font-bold">{status}</p>

          {canReport && captainOf && (
            <TeamResultForm
              matchId={match.id}
              teamId={captainOf.id}
              teamName={captainOf.name}
              homeName={home.name}
              awayName={away.name}
              members={captainOf.members.map((m) => ({ userId: m.userId, name: memberName(m) }))}
              mine={mine}
              theirs={theirs}
              playedIds={captainOf.members.filter((m) => played.has(m.userId)).map((m) => m.userId)}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {[home, away].map((t) => (
              <section
                key={t.id}
                className="rounded-2xl border-2 bg-card"
                aria-label={`Plantel de ${t.name}`}
              >
                <h2 className="border-b-2 px-4 py-3 text-lg font-extrabold">
                  <Link href={`/equipo/${t.slug}`} className="hover:underline">
                    {t.name}
                  </Link>
                </h2>
                <ul className="divide-y-2">
                  {t.members.map((m) => (
                    <li key={m.userId} className="flex items-center gap-3 px-4 py-2.5">
                      <PlayerAvatar
                        name={memberName(m)}
                        src={m.user.profile?.photoUrl ?? m.user.image}
                        className="size-9 text-sm"
                      />
                      <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate font-bold">
                        {m.user.profile ? (
                          <Link
                            href={`/jugador/${m.user.profile.username}`}
                            className="truncate hover:underline"
                          >
                            {memberName(m)}
                          </Link>
                        ) : (
                          memberName(m)
                        )}
                        {m.role === "CAPTAIN" && (
                          <Crown className="size-4 shrink-0 text-division-gold" aria-label="Capitán" />
                        )}
                      </span>
                      {played.has(m.userId) && (
                        <span className="inline-flex items-center gap-1 text-sm font-extrabold text-primary">
                          <Check className="size-4" aria-hidden strokeWidth={3} /> Jugó
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {user && (isMember || user.role === "ADMIN") ? (
            <MatchChat
              matchId={match.id}
              meId={user.id}
              canModerate={Boolean(captainOf) || user.role === "ADMIN"}
            />
          ) : (
            <p className="rounded-2xl border-2 border-dashed bg-secondary/40 px-5 py-4 text-sm text-muted-foreground">
              La sala del partido es para los jugadores de los dos equipos.
            </p>
          )}

          {match.notes && (
            <section className="rounded-2xl border-2 bg-card p-5" aria-labelledby="notas">
              <h2 id="notas" className="mb-2 text-lg font-extrabold">
                Notas
              </h2>
              <p className="text-[15px] whitespace-pre-line text-muted-foreground">{match.notes}</p>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          {match.venue?.latitude != null && match.venue.longitude != null ? (
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
          ) : (
            <p className="rounded-2xl border-2 bg-card p-5 text-[15px] text-muted-foreground">
              {match.venue ? match.venue.name : "La cancha está por coordinar entre los capitanes."}
            </p>
          )}
        </aside>
      </Container>
    </>
  );
}

function TeamHead({ team }: { team: Team }) {
  return (
    <Link href={`/equipo/${team.slug}`} className="flex min-w-0 flex-col items-center gap-2 text-center">
      <TeamCrest
        name={team.name}
        primary={team.primaryColor}
        secondary={team.secondaryColor}
        className="size-16 sm:size-20"
      />
      <span className="max-w-full text-xl font-display text-balance sm:text-3xl">{team.name}</span>
      <span className="text-sm font-bold text-white/80">{team.rating} de rango</span>
    </Link>
  );
}
