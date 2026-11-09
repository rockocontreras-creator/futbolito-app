import { divisionFor, type DivisionId } from "@/lib/rating/divisions";
import { cn } from "@/lib/utils";

const tone: Record<DivisionId, string> = {
  BRONZE: "text-division-bronze",
  SILVER: "text-division-silver",
  GOLD: "text-division-gold",
  PLATINUM: "text-division-platinum",
  DIAMOND: "text-division-diamond",
};

/** Escudo de división. Mismo dibujo en todo el sitio; el color dice la división. */
export function DivisionShield({ rating, className }: { rating: number; className?: string }) {
  const d = divisionFor(rating);
  return (
    <svg viewBox="0 0 24 28" className={cn("size-5", tone[d.id], className)} aria-hidden>
      <path d="M12 1 2 5v8c0 6.4 4.3 11.7 10 14 5.7-2.3 10-7.6 10-14V5L12 1Z" fill="currentColor" />
      <path d="M12 6.5 6 9v4.2c0 3.6 2.4 6.6 6 8 3.6-1.4 6-4.4 6-8V9l-6-2.5Z" fill="#fff" fillOpacity=".28" />
    </svg>
  );
}

export function DivisionBadge({
  rating,
  showRating = false,
  className,
}: {
  rating: number;
  showRating?: boolean;
  className?: string;
}) {
  const d = divisionFor(rating);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-semibold", className)}>
      <DivisionShield rating={rating} className="size-4" />
      {d.label}
      {showRating && <span className="font-score font-semibold text-muted-foreground">{rating}</span>}
    </span>
  );
}
