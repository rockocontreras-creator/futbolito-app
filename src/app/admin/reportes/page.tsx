import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Flag } from "lucide-react";
import Link from "next/link";
import { ReportActions } from "@/components/features/admin/admin-actions";
import { EmptyState } from "@/components/features/empty-state";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import { reportCategoryLabel } from "@/lib/reports";
import { getAdmin, listReportsForAdmin } from "@/server/queries/admin";

export default async function AdminReports() {
  if (!(await getAdmin())) return null;
  const reports = await listReportsForAdmin();
  const open = reports.filter((r) => r.status === "OPEN" || r.status === "REVIEWING");
  const closed = reports.filter((r) => r.status === "RESOLVED" || r.status === "DISMISSED");
  if (reports.length === 0) {
    return (
      <EmptyState icon={Flag} title="Sin reportes">
        Cuando un jugador reporte a otro desde su perfil, aparece acá.
      </EmptyState>
    );
  }
  return (
    <div className="space-y-10">
      <section aria-labelledby="abiertos" className="space-y-3">
        <h2 id="abiertos" className="text-xl font-extrabold">
          Por revisar ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="text-muted-foreground">No hay reportes pendientes.</p>
        ) : (
          <ul className="space-y-3">
            {open.map((r) => {
              const target = r.targetUser;
              const name = target?.profile?.displayName ?? target?.name ?? "Cuenta eliminada";
              const author = r.author.profile?.displayName ?? r.author.name ?? "Sin nombre";
              return (
                <li key={r.id} className="space-y-4 rounded-2xl border-2 bg-card p-4">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar name={name} src={target?.profile?.photoUrl} className="size-11" />
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold">
                        {target?.profile ? (
                          <Link href={`/jugador/${target.profile.username}`} className="hover:underline">
                            {name}
                          </Link>
                        ) : (
                          name
                        )}
                        {target?.suspendedAt && (
                          <span className="ml-2 rounded-lg bg-destructive/12 px-2 py-0.5 text-sm text-destructive">
                            Suspendida
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {r.totalAgainst === 1 ? "Es su primer reporte" : `Acumula ${r.totalAgainst} reportes`}{" "}
                        · Lo reportó {author}{" "}
                        {formatDistanceToNow(r.createdAt, { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-secondary/60 p-3">
                    <p className="text-sm font-extrabold">{reportCategoryLabel(r.category)}</p>
                    <p className="mt-1 text-[15px] whitespace-pre-line">{r.reason}</p>
                  </div>
                  <ReportActions
                    reportId={r.id}
                    canSuspend={Boolean(target) && !target?.suspendedAt && target?.role !== "ADMIN"}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {closed.length > 0 && (
        <section aria-labelledby="cerrados" className="space-y-3">
          <h2 id="cerrados" className="text-xl font-extrabold">
            Cerrados ({closed.length})
          </h2>
          <ul className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
            {closed.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <p className="font-bold">
                  {r.targetUser?.profile?.displayName ?? r.targetUser?.name ?? "Cuenta eliminada"}
                  <span className="font-medium text-muted-foreground">
                    {" "}
                    · {reportCategoryLabel(r.category)}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {r.resolution ?? (r.status === "DISMISSED" ? "Descartado" : "Revisado")} ·{" "}
                  {formatDistanceToNow(r.createdAt, { addSuffix: true, locale: es })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
