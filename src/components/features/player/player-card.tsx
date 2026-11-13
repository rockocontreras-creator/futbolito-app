import type { CSSProperties } from "react";
import { Mascot } from "@/components/layout/brand";
import { APP_NAME } from "@/config/site";
import { cardName, cardStats, overallFromRating, POSITION_ABBR, type CardInput } from "@/lib/player-card";
import { divisionFor, type DivisionId } from "@/lib/rating/divisions";
import { cn } from "@/lib/utils";

// Cada división tiñe la carta: fondo (de claro a intenso), tinta del texto y canto.
const TIER: Record<DivisionId, { from: string; to: string; ink: string; edge: string }> = {
  BRONZE: { from: "#f6d9bd", to: "#d99a62", ink: "#45260a", edge: "#a8672f" },
  SILVER: { from: "#f3f6f8", to: "#bcc8d0", ink: "#27333b", edge: "#8795a0" },
  GOLD: { from: "#fff0a8", to: "#f6c21c", ink: "#453200", edge: "#c99700" },
  PLATINUM: { from: "#d3f5f8", to: "#62c3d0", ink: "#0a3840", edge: "#2b93a3" },
  DIAMOND: { from: "#e4dfff", to: "#9a8df2", ink: "#1f1763", edge: "#6a5ae0" },
};

export interface PlayerCardData extends CardInput {
  displayName: string;
  nickname: string | null;
  photoUrl: string | null;
  primaryPosition: keyof typeof POSITION_ABBR;
}

/**
 * Carta de jugador: número general (sale del rango), posición, foto y seis atributos.
 * El color lo pone la división. Es solo presentación; los números vienen de `src/lib/player-card.ts`.
 */
export function PlayerCard({ player, className }: { player: PlayerCardData; className?: string }) {
  const division = divisionFor(player.rating);
  const tier = TIER[division.id];
  const overall = overallFromRating(player.rating);
  const stats = cardStats(player);
  const name = cardName(player.displayName, player.nickname);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <figure
      className={cn("w-full max-w-[300px] select-none", className)}
      style={
        {
          "--from": tier.from,
          "--to": tier.to,
          "--ink": tier.ink,
          "--edge": tier.edge,
          "--relieve-color": tier.edge,
        } as CSSProperties
      }
    >
      <div className="relative overflow-hidden rounded-[28px] border-4 border-(--edge) bg-linear-160 from-(--from) to-(--to) p-4 text-(--ink) relieve">
        {/* Círculo central y línea de cancha, como marca de agua */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-10 size-56 rounded-full border-[3px] border-white/45"
        />
        <span aria-hidden />

        <div className="relative grid grid-cols-[auto_1fr] items-end gap-3">
          <div className="pb-1 text-center">
            <p className="text-[4.25rem] leading-[0.9] font-score">{overall}</p>
            <p className="mt-1 text-xl font-display tracking-wide">{POSITION_ABBR[player.primaryPosition]}</p>
            <p className="mt-2 rounded-lg bg-(--ink)/12 px-2 py-0.5 text-[12px] font-extrabold tracking-wider uppercase">
              {division.label}
            </p>
          </div>
          <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-3xl border-4 border-white/80 bg-(--ink)/15 text-5xl font-display text-(--ink)/70">
            {player.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- fotos externas (Google/Supabase)
              <img
                src={player.photoUrl}
                alt=""
                className="size-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              initials || "?"
            )}
          </div>
        </div>

        <p className="relative mt-3 truncate text-center text-[1.6rem] font-display uppercase">{name}</p>
        <span
          aria-hidden
          className="relative mx-auto mt-1.5 mb-2.5 block h-[3px] w-2/3 rounded-full bg-(--ink)/20"
        />

        <dl className="relative grid grid-cols-2 gap-x-4 gap-y-1 px-2">
          {stats.map((s) => (
            <div key={s.id} className="flex items-baseline gap-2">
              <dd className="w-9 text-right text-2xl font-score">{s.value}</dd>
              <dt className="text-[15px] font-extrabold tracking-wide">
                <abbr title={s.label} className="no-underline">
                  {s.id}
                </abbr>
              </dt>
            </div>
          ))}
        </dl>

        <p className="relative mt-3 flex items-center justify-center gap-1.5 text-[12px] font-extrabold tracking-wider uppercase opacity-85">
          <Mascot className="size-4" /> {APP_NAME}
        </p>
      </div>
      <figcaption className="sr-only">
        Carta de {name}: general {overall}, división {division.label}.
      </figcaption>
    </figure>
  );
}

/** Qué mide cada atributo de la carta. */
export function CardLegend({ player }: { player: CardInput }) {
  return (
    <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
      {cardStats(player).map((s) => (
        <li key={s.id} className="flex items-baseline gap-2">
          <b className="w-9 font-extrabold">{s.id}</b>
          <span className="text-muted-foreground">{s.help}</span>
        </li>
      ))}
    </ul>
  );
}
