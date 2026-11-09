import { CalendarDays, LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignInRequired } from "@/components/features/auth/sign-in-required";
import { ProfileForm } from "@/components/features/player/profile-form";
import { ProfileView } from "@/components/features/player/profile-view";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { safeCallbackUrl } from "@/lib/auth";
import { formatMatchDate } from "@/lib/format";
import { signOutAction } from "@/server/actions/auth";
import { getPublicProfile, listPlayerUpcoming } from "@/server/queries/players";
import { getActiveComuna, listSectors } from "@/server/queries/zones";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Mi perfil" };

export default function ProfilePage({ searchParams }: PageProps<"/perfil">) {
  return (
    <Container className="max-w-4xl pt-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border bg-card" aria-hidden />}>
        <ProfileGate searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function ProfileGate({ searchParams }: { searchParams: PageProps<"/perfil">["searchParams"] }) {
  const { volver } = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    return (
      <SignInRequired
        next="/perfil"
        title="Ingresa para ver tu perfil"
        text="Tu perfil guarda tu rango, tus partidos y tus estadísticas."
      />
    );
  }

  if (!user.profile) {
    const comuna = await getActiveComuna();
    const sectors = comuna ? await listSectors(comuna.id) : [];
    const returnTo = typeof volver === "string" ? safeCallbackUrl(volver) : null;
    return (
      <>
        <PageHeader
          title="Crea tu perfil"
          description="Con tu posición y nivel armamos equipos parejos. Tu rango parte según el nivel que elijas."
        />
        <ProfileForm
          defaultName={user.name ?? ""}
          sectors={sectors}
          returnTo={returnTo === "/" ? null : returnTo}
        />
      </>
    );
  }

  const [profile, upcoming] = await Promise.all([
    getPublicProfile(user.profile.username),
    listPlayerUpcoming(user.id),
  ]);
  if (!profile) return null;

  return (
    <div className="space-y-8">
      <ProfileView profile={profile} />
      <section aria-labelledby="proximos" className="space-y-3">
        <h2 id="proximos" className="text-lg font-bold">
          Mis próximos partidos
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card/60 p-5 text-sm text-muted-foreground">
            No estás anotado en ningún partido.{" "}
            <Link href="/partidos" className="font-bold text-primary hover:underline">
              Buscar pichanga
            </Link>
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {upcoming.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/partidos/${p.matchId}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/50"
                >
                  <CalendarDays className="size-5 text-primary" aria-hidden />
                  <span className="flex-1">
                    <span className="block font-semibold first-letter:uppercase">
                      {formatMatchDate(p.match.startsAt)}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {p.match.venue?.name ?? "Cancha a coordinar"}
                    </span>
                  </span>
                  {p.status === "WAITLIST" && (
                    <span className="rounded bg-foco/30 px-2 py-0.5 text-[12px] font-bold">En espera</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="flex flex-wrap gap-3 border-t pt-6">
        <Button asChild variant="outline">
          <Link href={`/jugador/${profile.username}`}>Ver mi perfil público</Link>
        </Button>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" className="text-destructive hover:text-destructive">
            <LogOut aria-hidden /> Cerrar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
