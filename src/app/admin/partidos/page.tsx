import { CalendarCheck } from "lucide-react";
import Link from "next/link";
import { CancelMatch, ResolveResult } from "@/components/features/admin/admin-actions";
import { EmptyState } from "@/components/features/empty-state";
import { formatMatchDate } from "@/lib/format";
import { MATCH_TYPE_LABEL } from "@/lib/labels";
import { getAdmin, listResultsToReview, listUpcomingForAdmin } from "@/server/queries/admin";
import { confirmationsNeeded } from "@/server/services/match-result";

export default async function AdminMatches() {
  if (!(await getAdmin())) return null;
  const [results, upcoming] = await Promise.all([listResultsToReview(), listUpcomingForAdmin()]);
  return (
    <div className="space-y-10">
      <section aria-labelledby="resultados" className="space-y-3">
        <h2 id="resultados" className="text-xl font-extrabold">
          Resultados por resolver ({results.length})
        </h2>
        {results.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Nada por resolver">
            Acá aparecen los resultados en disputa y los que todavía no junta la mayoría.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {results.map((m) => {
              const attended = m.participants.length;
              const organizer = m.organizer.profile?.displayName ?? m.organizer.name ?? "Sin nombre";
              const teams = m.type !== "PICKUP";
              const home = m.homeTeam?.name ?? "Local";
              const away = m.awayTeam?.name ?? "Visita";
              const reportOf = (side: "A" | "B") => {
                const r = m.resultReports.find((x) => x.side === side);
                return r ? `${r.scoreA}–${r.scoreB}` : "todavía no reporta";
              };
              return (
                <li key={m.id} className="space-y-4 rounded-2xl border-2 bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-extrabold first-letter:uppercase">
                        <Link href={`/partidos/${m.id}`} className="hover:underline">
                          {teams ? `${home} vs ${away}` : formatMatchDate(m.startsAt)}
                        </Link>
                      </p>
                      <p className="text-[15px] text-muted-foreground">
                        {teams
                          ? `${MATCH_TYPE_LABEL[m.type]} · ${formatMatchDate(m.startsAt)}`
                          : `Revoltijo ${m.playersPerSide}v${m.playersPerSide}`}
                        {m.venue ? ` en ${m.venue.name}` : ""}
                        {teams ? "" : ` · Organiza ${organizer}`}
                      </p>
                    </div>
                    <span
                      className={
                        m.status === "DISPUTED"
                          ? "rounded-xl bg-destructive/12 px-3 py-1 text-sm font-extrabold text-destructive"
                          : "rounded-xl bg-foco/30 px-3 py-1 text-sm font-extrabold text-[#4a3c00] dark:text-foco"
                      }
                    >
                      {m.status === "DISPUTED"
                        ? "En disputa"
                        : teams
                          ? "Falta un capitán"
                          : "Esperando mayoría"}
                    </span>
                  </div>
                  {teams ? (
                    <p className="text-[15px]">
                      El capitán de {home} reportó <b className="font-score">{reportOf("A")}</b>; el de {away}
                      , <b className="font-score">{reportOf("B")}</b>. El marcador va como {home}–{away}.
                    </p>
                  ) : (
                    <p className="text-[15px]">
                      El organizador reportó{" "}
                      <b className="font-score">
                        {m.scoreA}–{m.scoreB}
                      </b>
                      . Confirman <b>{m._count.confirmations}</b> de {attended} (se necesitan{" "}
                      {confirmationsNeeded(attended)}); dicen que está mal <b>{m._count.objections}</b>.
                    </p>
                  )}
                  <ResolveResult
                    matchId={m.id}
                    scoreA={m.scoreA ?? 0}
                    scoreB={m.scoreB ?? 0}
                    labelA={teams ? home : "Equipo A"}
                    labelB={teams ? away : "Equipo B"}
                    pickup={!teams}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="proximos" className="space-y-3">
        <h2 id="proximos" className="text-xl font-extrabold">
          Partidos por jugar ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground">No hay partidos publicados.</p>
        ) : (
          <ul className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
            {upcoming.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <p className="min-w-0 flex-1">
                  <Link
                    href={`/partidos/${m.id}`}
                    className="font-extrabold first-letter:uppercase hover:underline"
                  >
                    {formatMatchDate(m.startsAt)}
                  </Link>
                  <span className="block text-sm text-muted-foreground">
                    {m.type === "PICKUP"
                      ? `Revoltijo ${m.playersPerSide}v${m.playersPerSide}`
                      : `${m.homeTeam?.name ?? "Local"} vs ${m.awayTeam?.name ?? "Visita"}`}
                    {m.venue ? ` en ${m.venue.name}` : ""}
                    {m.type === "PICKUP"
                      ? ` · ${m._count.participants} inscritos · Organiza ${m.organizer.profile?.displayName ?? m.organizer.name ?? "sin nombre"}`
                      : ""}
                  </span>
                </p>
                <CancelMatch matchId={m.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
