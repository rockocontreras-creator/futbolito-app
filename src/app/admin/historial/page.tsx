import Link from "next/link";
import { ADMIN_ACTION_LABEL, adminActionLabel, type AdminAction } from "@/lib/admin-log";
import { formatMatchDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getAdmin, listAdminLog } from "@/server/queries/admin";

export default async function AdminHistory({ searchParams }: PageProps<"/admin/historial">) {
  if (!(await getAdmin())) return null;
  const sp = await searchParams;
  const filter =
    typeof sp.tipo === "string" && sp.tipo in ADMIN_ACTION_LABEL ? (sp.tipo as AdminAction) : null;
  const log = await listAdminLog(filter ?? undefined);
  const chip = (on: boolean) =>
    cn(
      "rounded-xl border-2 px-3 py-1.5 text-sm font-extrabold whitespace-nowrap",
      on
        ? "border-primary bg-primary text-primary-foreground"
        : "bg-card text-muted-foreground hover:text-foreground",
    );
  return (
    <div className="space-y-5">
      <p className="text-[17px] text-muted-foreground">
        Lo que hace cada administrador desde el panel queda anotado acá. Se muestran las últimas 100 acciones.
      </p>
      <nav aria-label="Filtrar el historial">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href="/admin/historial"
              className={chip(filter === null)}
              aria-current={filter === null ? "page" : undefined}
            >
              Todo
            </Link>
          </li>
          {(Object.keys(ADMIN_ACTION_LABEL) as AdminAction[]).map((a) => (
            <li key={a}>
              <Link
                href={`/admin/historial?tipo=${a}`}
                className={chip(filter === a)}
                aria-current={filter === a ? "page" : undefined}
              >
                {ADMIN_ACTION_LABEL[a]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {log.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed bg-secondary/40 p-6 text-center text-muted-foreground">
          {filter ? "Nada de este tipo todavía." : "Todavía no hay acciones registradas."}
        </p>
      ) : (
        <ul className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
          {log.map((l) => (
            <li
              key={l.id}
              className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-4"
            >
              <p className="text-[15px] break-words">
                <b className="font-extrabold">{l.admin.profile?.displayName ?? l.admin.name ?? "Un admin"}</b>{" "}
                <span className="lowercase">{l.summary.charAt(0)}</span>
                {l.summary.slice(1)}
              </p>
              <p className="text-sm text-muted-foreground sm:text-right">
                {adminActionLabel(l.action)} · {formatMatchDate(l.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
