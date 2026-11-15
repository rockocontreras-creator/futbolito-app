import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { BroadcastForm } from "@/components/features/admin/admin-edit";
import { MAX_BROADCASTS_PER_DAY } from "@/lib/admin-log";
import { broadcastAudience, getAdmin, listAdminLog } from "@/server/queries/admin";
import { getActiveComuna } from "@/server/queries/zones";

export default async function AdminBroadcast() {
  if (!(await getAdmin())) return null;
  const comuna = await getActiveComuna();
  if (!comuna) return <p className="text-muted-foreground">No hay comuna activa.</p>;
  const [audience, sent] = await Promise.all([broadcastAudience(comuna.id), listAdminLog("broadcast")]);
  const remaining = Math.max(0, MAX_BROADCASTS_PER_DAY - audience.sentToday);
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <section aria-labelledby="nuevo-aviso" className="space-y-4">
        <h2 id="nuevo-aviso" className="text-xl font-extrabold">
          Aviso para todo {comuna.name}
        </h2>
        <p className="text-[15px] text-muted-foreground">
          Le llega a la campana de las {audience.people} personas con perfil; {audience.withPush} de ellas lo
          reciben además en el celular.{" "}
          {remaining > 0
            ? `Hoy puedes mandar ${remaining} más (máximo ${MAX_BROADCASTS_PER_DAY} cada 24 horas).`
            : `Ya se mandaron ${MAX_BROADCASTS_PER_DAY} en las últimas 24 horas: espera para mandar otro.`}
        </p>
        <BroadcastForm people={audience.people} remaining={remaining} />
      </section>
      <section aria-labelledby="enviados" className="space-y-3">
        <h2 id="enviados" className="text-xl font-extrabold">
          Avisos enviados
        </h2>
        {sent.length === 0 ? (
          <p className="text-muted-foreground">Todavía no se manda ninguno.</p>
        ) : (
          <ul className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
            {sent.map((s) => (
              <li key={s.id} className="space-y-1 px-4 py-3">
                <p className="text-[15px] break-words">{s.summary.replace(/^Mandó un aviso a /, "A ")}</p>
                <p className="text-sm text-muted-foreground">
                  {s.admin.profile?.displayName ?? s.admin.name ?? "Un admin"} ·{" "}
                  {formatDistanceToNow(s.createdAt, { addSuffix: true, locale: es })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
