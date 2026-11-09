import { Shield } from "lucide-react";
import { divisionFor, type DivisionId } from "@/lib/rating/divisions";
import { cn } from "@/lib/utils";

const styles: Record<DivisionId, string> = {
  BRONZE: "bg-division-bronze/15 text-division-bronze border-division-bronze/40",
  SILVER: "bg-division-silver/20 text-foreground border-division-silver/50",
  GOLD: "bg-division-gold/20 text-foreground border-division-gold/60",
  PLATINUM: "bg-division-platinum/20 text-foreground border-division-platinum/60",
  DIAMOND: "bg-division-diamond/15 text-division-diamond border-division-diamond/50",
};

/** Insignia de división, consistente en todo el sitio (CLAUDE.md §9). */
export function DivisionBadge({
  rating,
  showRating = false,
  className,
}: {
  rating: number;
  showRating?: boolean;
  className?: string;
}) {
  const division = divisionFor(rating);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        styles[division.id],
        className,
      )}
    >
      <Shield className="size-3" aria-hidden />
      {division.label}
      {showRating && <span className="font-normal opacity-80">· {rating}</span>}
    </span>
  );
}
