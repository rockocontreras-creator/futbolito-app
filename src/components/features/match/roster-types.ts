export interface RosterPlayer {
  userId: string;
  name: string;
  username: string | null;
  photo: string | null;
  rating: number | null;
  position: "GOALKEEPER" | "DEFENDER" | "MIDFIELDER" | "FORWARD" | "FLEX" | null;
  side: "A" | "B" | null;
  status: "REGISTERED" | "WAITLIST" | "ATTENDED" | "NO_SHOW";
  isOrganizer: boolean;
}

export function averageRating(players: readonly RosterPlayer[]): number | null {
  const r = players.map((p) => p.rating).filter((x): x is number => x != null);
  return r.length ? Math.round(r.reduce((a, b) => a + b, 0) / r.length) : null;
}
