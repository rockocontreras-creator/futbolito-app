import { Search } from "lucide-react";
import Link from "next/link";
import { TeamAdmin } from "@/components/features/admin/admin-edit";
import { TeamCrest } from "@/components/features/team/team-crest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdmin, listTeamsForAdmin } from "@/server/queries/admin";

export default async function AdminTeams({ searchParams }: PageProps<"/admin/equipos">) {
  if (!(await getAdmin())) return null;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const teams = await listTeamsForAdmin(q);
  return (
    <div className="space-y-5">
      <form action="/admin/equipos" className="flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Buscar equipo
        </label>
        <Input id="q" name="q" defaultValue={q} placeholder="Nombre del equipo" />
        <Button type="submit" className="h-12">
          <Search aria-hidden /> Buscar
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        {q
          ? `${teams.length} ${teams.length === 1 ? "equipo" : "equipos"} para “${q}”.`
          : `Los ${teams.length} equipos más nuevos.`}{" "}
        Al borrar un equipo se anulan sus partidos por jugar y se les avisa a sus jugadores.
      </p>
      {teams.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed bg-secondary/40 p-6 text-center text-muted-foreground">
          {q ? "No encontramos equipos con ese nombre." : "Todavía no hay equipos."}
        </p>
      ) : (
        <ul className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
          {teams.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
              <TeamCrest
                name={t.name}
                primary={t.primaryColor}
                secondary={t.secondaryColor}
                className="size-11 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">
                  <Link href={`/equipo/${t.slug}`} className="hover:underline">
                    {t.name}
                  </Link>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t._count.members} {t._count.members === 1 ? "jugador" : "jugadores"} · {t.rating} de rango
                  · {t.matchesPlayed} PJ
                </p>
              </div>
              <TeamAdmin teamId={t.id} name={t.name} description={t.description} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
