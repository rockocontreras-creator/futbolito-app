import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/session";
import { PlayerAvatar } from "@/components/features/player/player-avatar";

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Button asChild size="sm">
        <Link href="/ingresar">Ingresar</Link>
      </Button>
    );
  }
  const name = user.profile?.displayName ?? user.name ?? user.email ?? "Jugador";
  return (
    <>
      {user.role === "ADMIN" && (
        <Link
          href="/admin"
          aria-label="Panel de administración"
          className="flex h-10 items-center gap-1.5 rounded-xl border-2 px-2.5 text-sm font-extrabold text-primary hover:bg-secondary"
        >
          <ShieldCheck className="size-5" aria-hidden strokeWidth={2.4} />
          <span className="hidden sm:inline">Admin</span>
        </Link>
      )}
      <Link
        href="/perfil"
        className="flex items-center gap-2 rounded-2xl border-2 border-transparent py-1 pr-1 pl-1 hover:border-border hover:bg-secondary sm:pl-3"
        aria-label="Mi perfil"
      >
        <span className="hidden max-w-36 truncate text-[15px] font-extrabold sm:block">
          {name.split(" ")[0]}
        </span>
        <PlayerAvatar name={name} src={user.profile?.photoUrl ?? user.image} className="size-9 text-sm" />
      </Link>
    </>
  );
}

export function UserMenuFallback() {
  return <span className="block h-8 w-20 animate-pulse rounded-full bg-secondary" aria-hidden />;
}
