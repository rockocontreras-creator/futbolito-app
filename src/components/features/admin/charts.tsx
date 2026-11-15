// Gráficos del panel: una sola serie cada uno, así que el título dice qué se mide y no hay leyenda.
// Columnas delgadas ancladas a la base, valor sobre cada una y la misma información como tabla.

interface Point {
  label: string;
  value: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function TableView({
  points,
  unit,
  columnTitle,
}: {
  points: Point[];
  unit: [string, string];
  columnTitle: string;
}) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-bold text-muted-foreground hover:text-foreground">
        Ver como tabla
      </summary>
      <table className="mt-2 w-full max-w-xs text-left tabular-nums">
        <thead>
          <tr className="text-muted-foreground">
            <th className="py-1 font-bold">{columnTitle}</th>
            <th className="py-1 text-right font-bold capitalize">{unit[1]}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.label} className="border-t">
              <td className="py-1">{p.label}</td>
              <td className="py-1 text-right font-bold">{p.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Columnas por período (semanas, horas). */
export function ColumnChart({
  title,
  points,
  unit,
  columnTitle,
  empty,
}: {
  title: string;
  points: Point[];
  /** Singular y plural de lo que se cuenta: ["partido", "partidos"]. */
  unit: [string, string];
  columnTitle: string;
  empty: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const id = `chart-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <section className="space-y-3 rounded-2xl border-2 bg-card p-5" aria-labelledby={id}>
      <h2 id={id} className="text-lg font-extrabold">
        {title}
      </h2>
      {total === 0 ? (
        <p className="text-muted-foreground">{empty}</p>
      ) : (
        <>
          <ul className="flex items-end gap-1 border-b pb-px" aria-hidden>
            {points.map((p) => (
              <li
                key={p.label}
                title={`${p.label}: ${plural(p.value, unit[0], unit[1])}`}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
              >
                <span className="text-sm font-bold tabular-nums">{p.value > 0 ? p.value : ""}</span>
                <span
                  className="w-full max-w-6 rounded-t bg-primary"
                  style={{ height: `${Math.max(p.value > 0 ? 3 : 0, Math.round((p.value / max) * 120))}px` }}
                />
              </li>
            ))}
          </ul>
          <ul className="flex gap-1 text-[12px] text-muted-foreground" aria-hidden>
            {points.map((p) => (
              <li key={p.label} className="min-w-0 flex-1 text-center leading-tight">
                {p.label}
              </li>
            ))}
          </ul>
          <TableView points={points} unit={unit} columnTitle={columnTitle} />
        </>
      )}
    </section>
  );
}

/** Lista ordenada con una barra por fila (canchas más usadas, jugadores más activos). */
export function RankBars({
  title,
  rows,
  unit,
  empty,
}: {
  title: string;
  rows: { label: string; value: number; href?: string }[];
  unit: [string, string];
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const id = `rank-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <section className="space-y-3 rounded-2xl border-2 bg-card p-5" aria-labelledby={id}>
      <h2 id={id} className="text-lg font-extrabold">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{empty}</p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label} className="space-y-1">
              <p className="flex items-baseline justify-between gap-3 text-[15px]">
                {r.href ? (
                  <a href={r.href} className="truncate font-bold hover:underline">
                    {r.label}
                  </a>
                ) : (
                  <span className="truncate font-bold">{r.label}</span>
                )}
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {plural(r.value, unit[0], unit[1])}
                </span>
              </p>
              <span
                className="block h-2.5 rounded-r bg-primary"
                style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
                aria-hidden
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
