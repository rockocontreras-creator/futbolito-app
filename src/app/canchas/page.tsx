import { Lightbulb, MapPin, Navigation, Plus, Umbrella } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/features/empty-state";
import { VenueMap } from "@/components/features/venue/venue-map";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { formatCLP } from "@/lib/format";
import { SURFACE_LABEL } from "@/lib/labels";
import { directionsUrl } from "@/lib/maps";
import { listMapVenues, type MapVenueRow } from "@/server/queries/venues";
import { getActiveComuna } from "@/server/queries/zones";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Canchas" };

export default function VenuesPage() {
  return (
    <Container className="pt-8">
      <PageHeader
        title="Canchas"
        description="Dónde se juega en San Clemente. Toca una cancha en el mapa para ver cómo llegar."
        action={
          <Button asChild>
            <Link href="/canchas/nueva">
              <Plus aria-hidden /> Proponer cancha
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl border bg-card" aria-hidden />}>
        <VenuesContent />
      </Suspense>
    </Container>
  );
}

async function VenuesContent() {
  const user = await getCurrentUser();
  const comuna = await getActiveComuna(user?.profile?.comunaId);
  const venues = comuna ? await listMapVenues(comuna.id, user?.id ?? null) : [];
  const onMap = venues.filter((v) => v.latitude != null && v.longitude != null);

  if (venues.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="Todavía no hay canchas cargadas"
        action={
          <Button asChild>
            <Link href="/canchas/nueva">Proponer la primera</Link>
          </Button>
        }
      >
        Marca en el mapa dónde juegas y ayuda a que todos lleguen.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <VenueMap
        className="h-[420px]"
        center={
          comuna?.latitude && comuna.longitude ? { lat: comuna.latitude, lng: comuna.longitude } : undefined
        }
        venues={onMap.map((v) => ({
          id: v.id,
          name: v.name,
          lat: v.latitude!,
          lng: v.longitude!,
          subtitle: SURFACE_LABEL[v.surface],
          pending: v.status === "PENDING",
        }))}
      />
      <ul className="grid gap-3 md:grid-cols-2">
        {venues.map((v) => (
          <li key={v.id}>
            <VenueCard v={v} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function VenueCard({ v }: { v: MapVenueRow }) {
  const upcoming = v._count.matches;
  return (
    <article className="flex h-full flex-col gap-3 rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{v.name}</h2>
          <p className="text-sm text-muted-foreground">
            {[v.address, v.sector?.name].filter(Boolean).join(", ") || "Sin dirección"}
          </p>
        </div>
        {v.status === "PENDING" && (
          <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-[12px] font-bold">Por aprobar</span>
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <li>{SURFACE_LABEL[v.surface]}</li>
        {v.hasLighting && (
          <li className="inline-flex items-center gap-1">
            <Lightbulb className="size-4 text-[#b38d00]" aria-hidden /> Iluminación
          </li>
        )}
        {v.isCovered && (
          <li className="inline-flex items-center gap-1">
            <Umbrella className="size-4" aria-hidden /> Techada
          </li>
        )}
        {v.referencePrice != null && <li>{formatCLP(v.referencePrice)} la hora aprox.</li>}
      </ul>
      {v.contact && <p className="text-sm text-muted-foreground">Contacto: {v.contact}</p>}
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        {v.latitude != null && v.longitude != null ? (
          <Button asChild size="sm" variant="outline">
            <a href={directionsUrl(v.latitude, v.longitude)} target="_blank" rel="noopener noreferrer">
              <Navigation aria-hidden /> Cómo llegar
            </a>
          </Button>
        ) : (
          <span className="text-[13px] text-muted-foreground">Sin ubicación en el mapa</span>
        )}
        <Button asChild size="sm" variant="ghost">
          <Link href="/partidos">
            {upcoming > 0
              ? `${upcoming} ${upcoming === 1 ? "partido próximo" : "partidos próximos"}`
              : "Ver partidos"}
          </Link>
        </Button>
      </div>
    </article>
  );
}
