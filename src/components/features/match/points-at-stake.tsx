import { previewPoints } from "@/lib/rating/elo";

function signed(n: number) {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}

/**
 * Lo que se juega cada lado antes del partido, como en FACEIT: los puntos dependen de qué tan parejo
 * es el cruce, no de los goles. `half` muestra además lo que se mueve cada jugador en un partido entre equipos.
 */
export function PointsAtStake({
  sides,
  note,
}: {
  sides: [{ label: string; rating: number }, { label: string; rating: number }];
  note?: string;
}) {
  const [a, b] = sides;
  const rows = [
    { ...a, points: previewPoints(a.rating, b.rating) },
    { ...b, points: previewPoints(b.rating, a.rating) },
  ];
  return (
    <section className="space-y-3 rounded-2xl border-2 bg-card p-5" aria-labelledby="en-juego">
      <h2 id="en-juego" className="text-lg font-extrabold">
        Puntos en juego
      </h2>
      <dl className="grid grid-cols-2 gap-3">
        {rows.map((row) => (
          <div key={row.label} className="space-y-1 rounded-xl bg-secondary/60 p-3">
            <dt className="truncate text-sm font-extrabold">{row.label}</dt>
            <dd className="text-sm text-muted-foreground tabular-nums">
              <span className="text-lg font-score text-primary">{signed(row.points.win)}</span> si gana
              <br />
              <span className="text-lg font-score text-destructive">{signed(row.points.loss)}</span> si pierde
              {row.points.draw !== 0 && (
                <>
                  <br />
                  <span className="text-lg font-score text-foreground">{signed(row.points.draw)}</span> si
                  empatan
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        {note ?? "Todo el equipo gana o pierde lo mismo. No importa por cuántos goles."}
      </p>
    </section>
  );
}
