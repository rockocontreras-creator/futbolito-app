import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CloudRain, MapPin } from "lucide-react";
import Link from "next/link";
import { DivisionBadge } from "@/components/features/player/division-badge";
import { TIMEZONE } from "@/config/site";
import { formatCLP } from "@/lib/format";
import { MATCH_TYPE_LABEL } from "@/lib/labels";
import type { MatchCardData } from "@/server/queries/matches";
import { SlotBar } from "./slot-bar";

/**
 * Tarjeta de partido tipo "entrada": la hora manda a la izquierda,
 * el detalle a la derecha y los cupos abajo.
 */
export function MatchCard({ match }: { match: MatchCardData }) {
  const local = new TZDate(match.startsAt, TIMEZONE);
  const missing = match.total - match.taken;
  return (
    <Link
      href={`/partidos/${match.id}`}
      className="group grid grid-cols-[76px_1fr] overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/50 focus-visible:ring-4 focus-visible:ring-ring/30"
    >
      <div className="flex flex-col items-center justify-center gap-0.5 border-r border-dashed bg-secondary/60 px-2 py-4 text-center">
        <span className="text-[12px] font-semibold text-muted-foreground capitalize">
          {format(local, "EEE", { locale: es }).replace(".", "")}
        </span>
        <span className="text-3xl leading-none font-score">{format(local, "d")}</span>
        <span className="text-[12px] font-semibold text-muted-foreground">
          {format(local, "MMM", { locale: es }).replace(".", "")}
        </span>
        <span className="mt-2 rounded-md bg-cancha px-1.5 py-0.5 text-[15px] font-score text-white">
          {format(local, "HH:mm")}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[17px] leading-snug font-bold group-hover:underline group-hover:underline-offset-2">
              {match.title}
            </h3>
            <span className="sr-only">{MATCH_TYPE_LABEL[match.type]}. </span>
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {match.venueName ?? "Cancha a coordinar"}
            </p>
          </div>
          {match.pricePerPerson ? (
            <span className="shrink-0 rounded-md bg-foco/30 px-2 py-0.5 text-[13px] font-bold text-[#4a3c00] dark:text-foco">
              {formatCLP(match.pricePerPerson)}
            </span>
          ) : null}
        </div>
        {match.weather && (
          <p
            className={
              match.weather.level === "bad"
                ? "flex items-center gap-1.5 rounded-md bg-[#dbeafe] px-2 py-1 text-[13px] font-bold text-[#1e3a8a]"
                : "flex items-center gap-1.5 rounded-md bg-foco/25 px-2 py-1 text-[13px] font-bold text-[#5a4500] dark:text-foco"
            }
          >
            <CloudRain className="size-4 shrink-0" aria-hidden /> {match.weather.title}
          </p>
        )}
        <SlotBar taken={match.taken} total={match.total} />
        <div className="flex items-center justify-between">
          {match.avgRating ? <DivisionBadge rating={match.avgRating} showRating /> : <span />}
          <span className="text-sm font-bold text-primary">
            {missing > 0 ? "Sumarme" : "Ver lista de espera"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function MatchCardSkeleton() {
  return <div className="h-[168px] animate-pulse rounded-xl border bg-card" aria-hidden />;
}
