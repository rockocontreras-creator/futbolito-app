import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Banknote, Clock3, MapPin, MessageCircle, Shield, Users } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SlotBar } from "@/components/features/match/slot-bar";
import { RosterActions, type ViewerState } from "@/components/features/match/roster-actions";
import { DivisionBadge } from "@/components/features/player/division-badge";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { TIMEZONE } from "@/config/site";
import { formatCLP } from "@/lib/format";
import { MATCH_TYPE_LABEL, POSITION_LABEL, SURFACE_LABEL } from "@/lib/labels";
import { pickupShareText, whatsappUrl } from "@/lib/share";
import { getMatchDetail, type MatchDetail } from "@/server/queries/matches";
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
  const [match, user, h] = await Promise.all([getMatchDetail(id), getCurrentUser(), headers()]);
  if (!match) notFound();

  const now = new Date();
  const local = new TZDate(match.startsAt, TIMEZONE);
  const registered = match.participants.filter((p) => p.status !== "WAITLIST");
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
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden /> Partidos
          </Link>
          <div className="space-y-3">
            <p className="inline-flex rounded-full bg-foco px-3 py-1 text-sm font-bold text-[#2a2205]">
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
          </div>
        </Container>
      </section>

      <Container className="grid gap-6 pt-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-6 lg:order-1">
          <section className="space-y-4 rounded-xl border bg-card p-5" aria-labelledby="cupos">
            <div className="flex items-center justify-between">
              <h2 id="cupos" className="text-lg font-bold">
                Cupos
              </h2>
              <span className="text-sm text-muted-foreground">Organiza {organizerName}</span>
            </div>
            <SlotBar taken={registered.length} total={total} />
          </section>

          <section className="rounded-xl border bg-card" aria-labelledby="jugadores">
            <h2 id="jugadores" className="flex items-center gap-2 border-b px-5 py-4 text-lg font-bold">
              <Users className="size-5 text-primary" aria-hidden /> Quiénes van
            </h2>
            <ul className="divide-y">
              {registered.map((p) => (
                <PlayerRow key={p.id} p={p} isOrganizer={p.userId === match.organizerId} />
              ))}
            </ul>
            {waitlist.length > 0 && (
              <>
                <h3 className="border-t bg-secondary/50 px-5 py-2.5 text-sm font-bold">Lista de espera</h3>
                <ul className="divide-y">
                  {waitlist.map((p) => (
                    <PlayerRow key={p.id} p={p} />
                  ))}
                </ul>
              </>
            )}
          </section>

          {match.notes && (
            <section className="rounded-xl border bg-card p-5" aria-labelledby="notas">
              <h2 id="notas" className="mb-2 text-lg font-bold">
                Notas del organizador
              </h2>
              <p className="text-[15px] whitespace-pre-line text-muted-foreground">{match.notes}</p>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:order-2">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <RosterActions matchId={match.id} viewer={viewerStateFor(match, user, now)} />
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

/** "lunes 9 de noviembre" → "Lunes 9 de noviembre" (CSS capitalize pondría "De" y "Noviembre"). */
function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Detail({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock3 }) {
  return (
    <div className="space-y-1 bg-card p-4">
      <dt className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function PlayerRow({
  p,
  isOrganizer = false,
}: {
  p: MatchDetail["participants"][number];
  isOrganizer?: boolean;
}) {
  const profile = p.user.profile;
  const name = profile?.nickname || profile?.displayName || p.user.name || "Jugador";
  const content = (
    <>
      <PlayerAvatar name={name} src={profile?.photoUrl ?? p.user.image} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {name}
          {isOrganizer && (
            <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[11px] font-bold">Organiza</span>
          )}
        </p>
        <p className="text-[13px] text-muted-foreground">
          {profile ? POSITION_LABEL[profile.primaryPosition] : "Sin perfil"}
        </p>
      </div>
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
        <div className="h-64 animate-pulse rounded-xl border bg-card" />
        <div className="h-48 animate-pulse rounded-xl border bg-card" />
      </Container>
    </>
  );
}
