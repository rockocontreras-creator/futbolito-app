import { Clock, MapPin, Users } from "lucide-react";
import { DivisionBadge } from "@/components/features/player/division-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatMatchDate, formatSlots } from "@/lib/format";

export type MatchCardType = "PICKUP" | "CHALLENGE" | "LEAGUE";

const typeLabel: Record<MatchCardType, string> = {
  PICKUP: "Revoltijo",
  CHALLENGE: "Desafío",
  LEAGUE: "Liga",
};

export interface MatchCardProps {
  type: MatchCardType;
  startsAt: Date;
  venueName: string;
  playersPerSide: number;
  taken: number;
  total: number;
  avgRating?: number;
}

/** Tarjeta de partido: tipo, hora, cancha, cupos, rango promedio y botón grande (CLAUDE.md §9). */
export function MatchCard({
  type,
  startsAt,
  venueName,
  playersPerSide,
  taken,
  total,
  avgRating,
}: MatchCardProps) {
  const missing = total - taken;
  return (
    <Card className="gap-3">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={type === "PICKUP" ? "accent" : "secondary"}>{typeLabel[type]}</Badge>
          <span className="text-xs text-muted-foreground">
            {playersPerSide}v{playersPerSide}
          </span>
        </div>
        <p className="flex items-center gap-2 text-lg font-semibold capitalize">
          <Clock className="size-4 text-primary" aria-hidden />
          {formatMatchDate(startsAt)}
        </p>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden />
          {venueName}
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium">
            <Users className="size-4" aria-hidden />
            {formatSlots(taken, total)}
            {missing > 0 && <span className="text-muted-foreground">· faltan {missing}</span>}
          </span>
          {avgRating !== undefined && <DivisionBadge rating={avgRating} showRating />}
        </div>
      </CardContent>
      <CardFooter>
        <Button size="lg" className="w-full" disabled={missing <= 0}>
          {missing > 0 ? "Sumarme" : "Lista de espera"}
        </Button>
      </CardFooter>
    </Card>
  );
}
