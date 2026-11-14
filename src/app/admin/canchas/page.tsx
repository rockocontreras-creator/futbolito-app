import { MapPin } from "lucide-react";
import { VenueReview } from "@/components/features/admin/admin-actions";
import { EmptyState } from "@/components/features/empty-state";
import { formatCLP } from "@/lib/format";
import { SURFACE_LABEL } from "@/lib/labels";
import { directionsUrl } from "@/lib/maps";
import { getAdmin, listVenuesForAdmin } from "@/server/queries/admin";

const STATUS = {
  PENDING: { title: "Por aprobar", empty: "No hay canchas esperando." },
  APPROVED: { title: "En el mapa", empty: "Todavía no hay canchas aprobadas." },
  REJECTED: { title: "Rechazadas", empty: "" },
} as const;

export default async function AdminVenues() {
  if (!(await getAdmin())) return null;
  const venues = await listVenuesForAdmin();
  if (venues.length === 0) {
    return (
      <EmptyState icon={MapPin} title="Todavía no hay canchas">
        Cuando alguien proponga una cancha, aparece acá para que la apruebes.
      </EmptyState>
    );
  }
  return (
    <div className="space-y-8">
      {(["PENDING", "APPROVED", "REJECTED"] as const).map((status) => {
        const list = venues.filter((v) => v.status === status);
        if (list.length === 0 && status === "REJECTED") return null;
        return (
          <section key={status} aria-labelledby={`canchas-${status}`} className="space-y-3">
            <h2 id={`canchas-${status}`} className="text-xl font-extrabold">
              {STATUS[status].title} ({list.length})
            </h2>
            {list.length === 0 ? (
              <p className="text-muted-foreground">{STATUS[status].empty}</p>
            ) : (
              <ul className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
                {list.map((v) => {
                  const by = v.proposedBy?.profile?.displayName ?? v.proposedBy?.name;
                  return (
                    <li key={v.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0 space-y-1">
                        <p className="text-lg font-extrabold">{v.name}</p>
                        <p className="text-[15px] text-muted-foreground">
                          {SURFACE_LABEL[v.surface]}
                          {v.address ? ` · ${v.address}` : ""}
                          {v.referencePrice ? ` · ${formatCLP(v.referencePrice)} la hora` : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {by ? `La propuso ${by}` : "Sin autor"}
                          {v.contact ? ` · Contacto: ${v.contact}` : ""}
                          {v._count.matches > 0
                            ? ` · ${v._count.matches} ${v._count.matches === 1 ? "partido" : "partidos"}`
                            : ""}
                        </p>
                        {v.latitude != null && v.longitude != null ? (
                          <a
                            href={directionsUrl(v.latitude, v.longitude)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-extrabold text-primary hover:underline"
                          >
                            <MapPin className="size-4" aria-hidden /> Ver dónde queda
                          </a>
                        ) : (
                          <p className="text-sm font-bold text-destructive">Sin ubicación en el mapa</p>
                        )}
                      </div>
                      <VenueReview venueId={v.id} status={v.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
