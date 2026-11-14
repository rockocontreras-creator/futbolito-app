import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { adminCounts, getAdmin } from "@/server/queries/admin";

export default async function AdminHome() {
  if (!(await getAdmin())) return null;
  const c = await adminCounts();
  const todo = [
    {
      href: "/admin/canchas",
      n: c.pendingVenues,
      one: "cancha por aprobar",
      many: "canchas por aprobar",
      none: "Ninguna cancha por aprobar",
    },
    {
      href: "/admin/partidos",
      n: c.disputed,
      one: "resultado en disputa",
      many: "resultados en disputa",
      none: "Ningún resultado en disputa",
    },
    {
      href: "/admin/partidos",
      n: c.pendingResults,
      one: "resultado esperando confirmación",
      many: "resultados esperando confirmación",
      none: "Ningún resultado esperando confirmación",
    },
    {
      href: "/admin/reportes",
      n: c.openReports,
      one: "reporte de jugador por revisar",
      many: "reportes de jugadores por revisar",
      none: "Ningún reporte por revisar",
    },
  ];
  const facts = [
    { one: "cuenta", many: "cuentas", value: c.users },
    { one: "perfil de jugador", many: "perfiles de jugador", value: c.profiles },
    { one: "partido por jugar", many: "partidos por jugar", value: c.upcoming },
    { one: "cuenta suspendida", many: "cuentas suspendidas", value: c.suspended },
  ];

  return (
    <div className="space-y-8">
      <section aria-labelledby="por-revisar" className="space-y-3">
        <h2 id="por-revisar" className="text-xl font-extrabold">
          Por revisar
        </h2>
        <ul className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
          {todo.map((t) => (
            <li key={t.one}>
              <Link
                href={t.href}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-secondary/60 focus-visible:bg-secondary focus-visible:outline-none"
              >
                <span
                  className={
                    t.n > 0
                      ? "grid size-10 shrink-0 place-items-center rounded-xl bg-foco text-lg font-score text-accent-foreground"
                      : "grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-lg font-score text-muted-foreground"
                  }
                >
                  {t.n}
                </span>
                <span className={t.n > 0 ? "flex-1 font-extrabold" : "flex-1 text-muted-foreground"}>
                  {t.n === 0 ? t.none : t.n === 1 ? `Hay 1 ${t.one}` : `Hay ${t.n} ${t.many}`}
                </span>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden strokeWidth={2.6} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="club" className="space-y-3">
        <h2 id="club" className="text-xl font-extrabold">
          El club hoy
        </h2>
        <p className="text-[17px]">
          {facts.map((f, i) => (
            <span key={f.one}>
              <b className="font-score">{f.value}</b> {f.value === 1 ? f.one : f.many}
              {i < facts.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
      </section>
    </div>
  );
}
