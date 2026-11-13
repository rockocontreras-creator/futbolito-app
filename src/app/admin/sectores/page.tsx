import { SectorCreate, SectorRow } from "@/components/features/admin/admin-actions";
import { getAdmin, listSectorsForAdmin } from "@/server/queries/admin";
import { getActiveComuna } from "@/server/queries/zones";

export default async function AdminSectors() {
  if (!(await getAdmin())) return null;
  const comuna = await getActiveComuna();
  if (!comuna) return <p className="text-muted-foreground">No hay comuna activa.</p>;
  const sectors = await listSectorsForAdmin(comuna.id);
  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-[17px] text-muted-foreground">
        Villas, poblaciones y localidades de {comuna.name}. Los jugadores eligen su sector en el perfil.
      </p>
      <SectorCreate />
      {sectors.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed bg-secondary/40 p-6 text-center text-muted-foreground">
          Todavía no hay sectores. Mientras no cargues ninguno, el perfil no pregunta por sector.
        </p>
      ) : (
        <ul className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
          {sectors.map((s) => (
            <SectorRow
              key={s.id}
              sectorId={s.id}
              name={s.name}
              isActive={s.isActive}
              players={s._count.players}
              venues={s._count.venues}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
