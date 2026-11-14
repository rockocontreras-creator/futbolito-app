import { Search } from "lucide-react";
import Link from "next/link";
import { UserActions } from "@/components/features/admin/admin-actions";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABEL, userChangeProblem } from "@/lib/admin";
import { adminEmails } from "@/lib/auth";
import { getAdmin, listUsersForAdmin } from "@/server/queries/admin";

export default async function AdminUsers({ searchParams }: PageProps<"/admin/usuarios">) {
  const admin = await getAdmin();
  if (!admin) return null;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const users = await listUsersForAdmin(q);
  const fixed = adminEmails();
  return (
    <div className="space-y-5">
      <form action="/admin/usuarios" className="flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Buscar cuenta
        </label>
        <Input id="q" name="q" defaultValue={q} placeholder="Nombre, usuario o correo" />
        <Button type="submit" className="h-12">
          <Search aria-hidden /> Buscar
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        {q
          ? `${users.length} ${users.length === 1 ? "cuenta" : "cuentas"} para “${q}”.`
          : `Las ${users.length} cuentas más recientes. Busca para encontrar otra.`}{" "}
        Una cuenta suspendida no puede entrar, inscribirse ni escribir.
      </p>
      {users.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed bg-secondary/40 p-6 text-center text-muted-foreground">
          No encontramos cuentas con eso.
        </p>
      ) : (
        <ul className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
          {users.map((u) => {
            const name = u.profile?.displayName ?? u.name ?? "Sin nombre";
            const locked = userChangeProblem({
              actorId: admin.id,
              targetId: u.id,
              targetRole: u.role,
              targetEmail: u.email,
              adminEmails: fixed,
              action: "role",
            });
            return (
              <li key={u.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <PlayerAvatar name={name} src={u.profile?.photoUrl ?? u.image} className="size-11" />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 font-extrabold">
                      {u.profile ? (
                        <Link href={`/jugador/${u.profile.username}`} className="hover:underline">
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                      {u.role !== "PLAYER" && (
                        <span className="rounded-lg bg-secondary px-2 py-0.5 text-sm text-primary">
                          {ROLE_LABEL[u.role]}
                        </span>
                      )}
                      {u.suspendedAt && (
                        <span className="rounded-lg bg-destructive/12 px-2 py-0.5 text-sm text-destructive">
                          Suspendida
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {u.email ?? "Sin correo"}
                      {u.profile
                        ? ` · @${u.profile.username} · ${u.profile.rating} de rango · ${u.profile.matchesPlayed} PJ`
                        : " · Sin perfil de jugador"}
                    </p>
                  </div>
                </div>
                <UserActions
                  userId={u.id}
                  role={u.role}
                  suspended={Boolean(u.suspendedAt)}
                  lockedReason={
                    locked === null ? null : u.id === admin.id ? "Esta es tu cuenta." : "Admin fijo."
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
