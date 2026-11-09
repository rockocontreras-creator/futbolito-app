import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/session";
import { PlayerAvatar } from "@/components/features/player/player-avatar";

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Button asChild size="sm" variant="dark">
        <Link href="/ingresar">Ingresar</Link>
      </Button>
    );
  }
  const name = user.profile?.displayName ?? user.name ?? user.email ?? "Jugador";
  return (
    <Link
      href="/perfil"
      className="flex items-center gap-2 rounded-full py-1 pr-1 pl-3 hover:bg-secondary"
      aria-label="Mi perfil"
    >
      <span className="hidden max-w-36 truncate text-sm font-semibold sm:block">{name.split(" ")[0]}</span>
      <PlayerAvatar name={name} src={user.profile?.photoUrl ?? user.image} className="size-8 text-xs" />
    </Link>
  );
}

export function UserMenuFallback() {
  return <span className="block h-8 w-20 animate-pulse rounded-full bg-secondary" aria-hidden />;
}
