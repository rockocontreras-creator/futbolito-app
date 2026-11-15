import { ColumnChart, RankBars } from "@/components/features/admin/charts";
import { getAdmin, getAdminStats } from "@/server/queries/admin";

export default async function AdminNumbers() {
  if (!(await getAdmin())) return null;
  const s = await getAdminStats();
  const facts = [
    { value: s.totals.played, one: "partido jugado", many: "partidos jugados" },
    { value: s.totals.newUsers, one: "cuenta nueva", many: "cuentas nuevas" },
    {
      value: s.totals.commends,
      one: "recomendación entre jugadores",
      many: "recomendaciones entre jugadores",
    },
  ];
  return (
    <div className="space-y-6">
      <p className="text-[17px]">
        En las últimas 8 semanas:{" "}
        {facts.map((f, i) => (
          <span key={f.one}>
            <b className="font-score">{f.value}</b> {f.value === 1 ? f.one : f.many}
            {i < facts.length - 1 ? " · " : "."}
          </span>
        ))}{" "}
        <span className="text-muted-foreground">
          Hoy hay <b className="font-score text-foreground">{s.totals.teams}</b>{" "}
          {s.totals.teams === 1 ? "equipo" : "equipos"} y{" "}
          <b className="font-score text-foreground">{s.totals.pushPeople}</b>{" "}
          {s.totals.pushPeople === 1 ? "persona con" : "personas con"} avisos al celular.
        </span>
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <ColumnChart
          title="Partidos jugados por semana"
          columnTitle="Semana del"
          unit={["partido", "partidos"]}
          points={s.weeks.map((label, i) => ({ label, value: s.played[i] ?? 0 }))}
          empty="Todavía no se juega ningún partido en estas semanas."
        />
        <ColumnChart
          title="Cuentas nuevas por semana"
          columnTitle="Semana del"
          unit={["cuenta", "cuentas"]}
          points={s.weeks.map((label, i) => ({ label, value: s.newUsers[i] ?? 0 }))}
          empty="Nadie se ha registrado en estas semanas."
        />
        <ColumnChart
          title="A qué hora se juega"
          columnTitle="Hora"
          unit={["partido", "partidos"]}
          points={s.hours.map((h) => ({ label: `${h.hour} h`, value: h.count }))}
          empty="Cuando haya partidos jugados vas a ver los horarios más usados."
        />
        <RankBars
          title="Canchas más usadas"
          unit={["partido", "partidos"]}
          rows={s.venues.map((v) => ({ label: v.key, value: v.count }))}
          empty="Cuando haya partidos jugados vas a ver dónde se juega más."
        />
        <RankBars
          title="Los que más jugaron en 30 días"
          unit={["partido", "partidos"]}
          rows={s.activePlayers.map((p) => ({
            label: p.name,
            value: p.matches,
            href: `/jugador/${p.username}`,
          }))}
          empty="Nadie ha jugado en los últimos 30 días."
        />
      </div>
    </div>
  );
}
