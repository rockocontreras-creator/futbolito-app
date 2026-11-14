import { CalendarDays, LogOut, Pencil, Share2, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignInRequired } from "@/components/features/auth/sign-in-required";
import { PhotoUpload } from "@/components/features/player/photo-upload";
import { PlayerCommunity } from "@/components/features/player/player-community";
import { ProfileForm } from "@/components/features/player/profile-form";
import { ProfileView } from "@/components/features/player/profile-view";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_URL } from "@/config/site";
import { safeCallbackUrl } from "@/lib/auth";
import { whatsappUrl } from "@/lib/share";
import { formatMatchDate } from "@/lib/format";
import { signOutAction } from "@/server/actions/auth";
import { getPlayerCommunity, getPublicProfile, listPlayerUpcoming } from "@/server/queries/players";
import { finalizeDueResults } from "@/server/services/finalize-results";
import { getActiveComuna, listSectors } from "@/server/queries/zones";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Mi perfil" };

export default function ProfilePage({ searchParams }: PageProps<"/perfil">) {
  return (
    <Container className="max-w-4xl pt-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border-2 bg-card" aria-hidden />}>
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
          photo={user.image}
          sectors={sectors}
          returnTo={returnTo === "/" ? null : returnTo}
        />
      </>
    );
  }

  await finalizeDueResults();
  const [profile, upcoming, community] = await Promise.all([
    getPublicProfile(user.profile.username),
    listPlayerUpcoming(user.id),
    getPlayerCommunity(user.id),
  ]);
  if (!profile) return null;

  return (
    <div className="space-y-8">
      {!profile.birthDate && (
        <p className="rounded-xl border border-foco/60 bg-foco/15 px-4 py-3 text-sm">
          Completa tu fecha de nacimiento para ganar tus etiquetas.{" "}
          <Link
            href="/perfil/editar"
            className="font-extrabold text-primary underline-offset-4 hover:underline"
          >
            Editar perfil
          </Link>
        </p>
      )}
      <ProfileView profile={profile} reviews={community.reviews} />
      <section aria-labelledby="foto" className="space-y-4 rounded-2xl border-2 bg-card p-5">
        <h2 id="foto" className="text-xl font-extrabold">
          Foto de perfil
        </h2>
        <PhotoUpload name={profile.displayName} photoUrl={profile.photoUrl} />
      </section>
      <section aria-labelledby="proximos" className="space-y-3">
        <h2 id="proximos" className="text-lg font-extrabold">
          Mis próximos partidos
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed bg-secondary/40 p-5 text-sm text-muted-foreground">
            No estás anotado en ningún partido.{" "}
            <Link href="/partidos" className="font-extrabold text-primary hover:underline">
              Buscar pichanga
            </Link>
          </p>
        ) : (
          <ul className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
            {upcoming.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/partidos/${p.matchId}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/50"
                >
                  <CalendarDays className="size-5 text-primary" aria-hidden />
                  <span className="flex-1">
                    <span className="block font-bold first-letter:uppercase">
                      {formatMatchDate(p.match.startsAt)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {p.match.venue?.name ?? "Cancha a coordinar"}
                    </span>
                  </span>
                  {p.status === "WAITLIST" && (
                    <span className="rounded bg-foco/30 px-2 py-0.5 text-[13px] font-extrabold">
                      En espera
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <PlayerCommunity
        profile={profile}
        community={community}
        viewer={{ userId: user.id, hasProfile: true, isAdmin: user.role === "ADMIN" }}
      />
      <div className="flex flex-wrap gap-3 border-t-2 pt-6">
        <Button asChild>
          <Link href="/perfil/editar">
            <Pencil aria-hidden /> Editar perfil
          </Link>
        </Button>
        <Button asChild variant="outline">
          <a
            href={whatsappUrl(
              `Mira mi carta de jugador en ${APP_NAME}: ${APP_URL}/jugador/${profile.username}`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            <Share2 aria-hidden /> Compartir mi carta
          </a>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/jugador/${profile.username}`}>Ver mi perfil público</Link>
        </Button>
        {user.role === "ADMIN" && (
          <Button asChild variant="outline">
            <Link href="/admin">
              <ShieldCheck aria-hidden /> Administración
            </Link>
          </Button>
        )}
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" className="text-destructive hover:text-destructive">
            <LogOut aria-hidden /> Cerrar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
