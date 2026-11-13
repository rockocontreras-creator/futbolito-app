import { isMinor, profileBadges, type ProfileBadge } from "@/lib/profile-badges";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import type { PlayerProfile } from "@/generated/prisma/client";
import { ageFrom } from "@/lib/format";
import { FOOT_LABEL, POSITION_LABEL } from "@/lib/labels";
import { divisionFor, DIVISIONS } from "@/lib/rating/divisions";
import { DivisionShield } from "./division-badge";
import { CardLegend, PlayerCard } from "./player-card";

type Profile = PlayerProfile & { comuna: { name: string }; sector: { name: string } | null };

/** Próximo escalón de división y cuánto falta. */
function nextDivision(rating: number) {
  const higher = [...DIVISIONS].reverse().find((d) => d.min > rating);
  return higher ? { label: higher.label, missing: higher.min - rating } : null;
}

export function ProfileView({
  profile,
  reviews,
}: {
  profile: Profile;
  /** Valoraciones de compañeros: alimentan el atributo VAL de la carta. */
  reviews?: { count: number; average: number | null };
}) {
  const division = divisionFor(profile.rating);
  const next = nextDivision(profile.rating);
  const attendance =
    profile.registrations > 0 ? Math.round((profile.attendances / profile.registrations) * 100) : null;
  const badges = profileBadges(profile);
  const card = { ...profile, reviewAverage: reviews?.average ?? null, reviewCount: reviews?.count ?? 0 };
  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-[300px_1fr] md:items-center md:gap-10">
        <PlayerCard player={card} className="mx-auto" />
        <div className="space-y-4">
          <div>
            <h1 className="text-[2rem] font-display sm:text-[2.75rem]">{profile.displayName}</h1>
            <p className="mt-1 text-[17px] text-muted-foreground">
              {profile.nickname ? `“${profile.nickname}” · ` : ""}@{profile.username}
            </p>
          </div>
          {badges.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Etiquetas">
              {badges.map((b) => (
                <li
                  key={b.id}
                  className={cn("rounded-xl px-3 py-1 text-sm font-extrabold", BADGE_STYLE[b.id])}
                >
                  {b.label}
                </li>
              ))}
            </ul>
          )}
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
            <span className="font-extrabold">
              {POSITION_LABEL[profile.primaryPosition]}
              {profile.secondaryPosition ? ` / ${POSITION_LABEL[profile.secondaryPosition]}` : ""}
            </span>
            <span className="text-muted-foreground">Pie {FOOT_LABEL[profile.foot].toLowerCase()}</span>
            {profile.birthDate && !isMinor(profile.birthDate) && (
              <span className="text-muted-foreground">{ageFrom(profile.birthDate)} años</span>
            )}
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              {profile.sector ? `${profile.sector.name}, ` : ""}
              {profile.comuna.name}
            </span>
          </p>
          <div className="flex items-center gap-4 rounded-2xl border-2 bg-card p-4 sm:max-w-sm">
            <DivisionShield rating={profile.rating} className="size-14" />
            <div>
              <p className="text-sm font-bold text-muted-foreground">División {division.label}</p>
              <p className="text-4xl leading-none font-score">{profile.rating}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {next ? `${next.missing} para ${next.label}` : "La división más alta"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="stats" className="space-y-3">
        <h2 id="stats" className="text-xl font-extrabold">
          Estadísticas
        </h2>
        <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
          <RecordBar
            played={profile.matchesPlayed}
            wins={profile.wins}
            draws={profile.draws}
            losses={profile.losses}
          />
          <dl className="grid grid-cols-3 divide-x-2 rounded-2xl border-2 bg-card">
            {[
              { label: "Goles", value: String(profile.goals) },
              { label: "MVP", value: String(profile.mvps) },
              { label: "Asistencia", value: attendance == null ? "—" : `${attendance}%` },
            ].map((x) => (
              <div
                key={x.label}
                className="flex flex-col-reverse items-center justify-center p-4 text-center"
              >
                <dt className="mt-1 text-sm text-muted-foreground">{x.label}</dt>
                <dd className="text-3xl leading-none font-score tabular-nums">{x.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <details className="rounded-2xl border-2 bg-card px-4 py-3">
          <summary className="cursor-pointer font-extrabold">Qué significan los números de la carta</summary>
          <div className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">
              El número grande sale del rango. Los otros seis van de 40 a 99 y se mueven con cada partido
              confirmado.
            </p>
            <CardLegend player={card} />
          </div>
        </details>
        {profile.matchesPlayed === 0 && (
          <p className="text-sm text-muted-foreground">
            Las estadísticas y el rango se mueven cuando se confirma el resultado de un partido.
          </p>
        )}
      </section>
    </div>
  );
}

const BADGE_STYLE: Record<ProfileBadge["id"], string> = {
  jugadora: "bg-[#fce7f3] text-[#9d174d] dark:bg-[#9d174d]/30 dark:text-[#fbcfe8]",
  "viejo-crack": "bg-foco/30 text-[#4a3c00] dark:text-foco",
  "joven-promesa": "bg-[#dbeafe] text-[#1e3a8a] dark:bg-[#1e3a8a]/40 dark:text-[#dbeafe]",
  comodin: "bg-primary/12 text-primary",
};

/** Partidos jugados con la barra de ganados / empatados / perdidos. */
function RecordBar({
  played,
  wins,
  draws,
  losses,
}: {
  played: number;
  wins: number;
  draws: number;
  losses: number;
}) {
  const total = wins + draws + losses;
  const parts = [
    { key: "G", label: "ganados", n: wins, className: "bg-primary" },
    { key: "E", label: "empatados", n: draws, className: "bg-foco" },
    { key: "P", label: "perdidos", n: losses, className: "bg-muted-foreground/40" },
  ];
  return (
    <div className="space-y-3 rounded-2xl border-2 bg-card p-4">
      <p className="flex items-baseline justify-between gap-3">
        <span>
          <span className="text-3xl leading-none font-score tabular-nums">{played}</span>{" "}
          <span className="text-muted-foreground">{played === 1 ? "partido" : "partidos"}</span>
        </span>
        {total > 0 && <span className="text-sm font-bold">{Math.round((wins / total) * 100)}% ganados</span>}
      </p>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
        {total > 0 &&
          parts.map((p) =>
            p.n > 0 ? <span key={p.key} className={p.className} style={{ flexGrow: p.n }} /> : null,
          )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${p.className}`} aria-hidden />
            <b className="font-score tabular-nums">{p.n}</b> {p.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
