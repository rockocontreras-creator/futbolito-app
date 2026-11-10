import { isMinor, profileBadges, type ProfileBadge } from "@/lib/profile-badges";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import type { PlayerProfile } from "@/generated/prisma/client";
import { ageFrom } from "@/lib/format";
import { FOOT_LABEL, POSITION_LABEL } from "@/lib/labels";
import { divisionFor, DIVISIONS } from "@/lib/rating/divisions";
import { DivisionShield } from "./division-badge";
import { PlayerAvatar } from "./player-avatar";

type Profile = PlayerProfile & { comuna: { name: string }; sector: { name: string } | null };

/** Próximo escalón de división y cuánto falta. */
function nextDivision(rating: number) {
  const higher = [...DIVISIONS].reverse().find((d) => d.min > rating);
  return higher ? { label: higher.label, missing: higher.min - rating } : null;
}

export function ProfileView({ profile }: { profile: Profile }) {
  const division = divisionFor(profile.rating);
  const next = nextDivision(profile.rating);
  const attendance =
    profile.registrations > 0 ? Math.round((profile.attendances / profile.registrations) * 100) : null;
  const stats = [
    { label: "Partidos", value: profile.matchesPlayed },
    { label: "Ganados", value: profile.wins },
    { label: "Empatados", value: profile.draws },
    { label: "Perdidos", value: profile.losses },
    { label: "Goles", value: profile.goals },
    { label: "MVP", value: profile.mvps },
  ];

  const badges = profileBadges(profile);
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="h-24 chalk-pitch sm:h-28" aria-hidden />
        <div className="-mt-12 grid gap-6 px-5 pb-6 sm:-mt-14 sm:grid-cols-[1fr_auto] sm:items-end sm:px-6">
          <div className="space-y-3">
            <PlayerAvatar
              name={profile.displayName}
              src={profile.photoUrl}
              className="size-24 border-4 border-card text-3xl sm:size-28"
            />
            <div>
              <h1 className="text-4xl font-display sm:text-5xl">{profile.displayName}</h1>
              <p className="mt-1 text-[15px] text-muted-foreground">
                {profile.nickname ? `“${profile.nickname}” · ` : ""}@{profile.username}
              </p>
            </div>
            {badges.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Etiquetas">
                {badges.map((b) => (
                  <li
                    key={b.id}
                    className={cn("rounded-full px-3 py-1 text-[13px] font-bold", BADGE_STYLE[b.id])}
                  >
                    {b.label}
                  </li>
                ))}
              </ul>
            )}
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold">
                {POSITION_LABEL[profile.primaryPosition]}
                {profile.secondaryPosition ? ` / ${POSITION_LABEL[profile.secondaryPosition]}` : ""}
              </span>
              <span className="text-muted-foreground">Pie {FOOT_LABEL[profile.foot].toLowerCase()}</span>
              {profile.birthDate && !isMinor(profile.birthDate) && (
                <span className="text-muted-foreground">{ageFrom(profile.birthDate)} años</span>
              )}
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden />
                {profile.sector ? `${profile.sector.name}, ` : ""}
                {profile.comuna.name}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-secondary/70 p-4 sm:min-w-64">
            <DivisionShield rating={profile.rating} className="size-14" />
            <div>
              <p className="text-sm font-semibold text-muted-foreground">División {division.label}</p>
              <p className="text-4xl leading-none font-score">{profile.rating}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {next ? `${next.missing} para ${next.label}` : "La división más alta"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="stats" className="space-y-3">
        <h2 id="stats" className="text-lg font-bold">
          Estadísticas
        </h2>
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-7">
          {stats.map((s) => (
            <div key={s.label} className="bg-card p-4 text-center">
              <dd className="text-3xl leading-none font-score">{s.value}</dd>
              <dt className="mt-1 text-[13px] text-muted-foreground">{s.label}</dt>
            </div>
          ))}
          <div className="col-span-3 bg-card p-4 text-center sm:col-span-1">
            <dd className="text-3xl leading-none font-score">
              {attendance == null ? "—" : `${attendance}%`}
            </dd>
            <dt className="mt-1 text-[13px] text-muted-foreground">Asistencia</dt>
          </div>
        </dl>
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
