import { cn } from "@/lib/utils";

/**
 * Los cupos como fila de jugadores: cada marca es un lugar en la cancha.
 * Es el elemento distintivo del sitio: dice de un vistazo cuánto falta para jugar.
 */
export function SlotBar({ taken, total, className }: { taken: number; total: number; className?: string }) {
  const missing = Math.max(total - taken, 0);
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex gap-[3px]" role="img" aria-label={`${taken} de ${total} cupos tomados`}>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 rounded-[2px]",
              i < taken ? "bg-primary" : "bg-muted ring-1 ring-border ring-inset",
            )}
          />
        ))}
      </div>
      <p className="text-[13px] font-semibold">
        <span className="text-[15px] font-score">
          {taken}/{total}
        </span>{" "}
        <span className={missing > 0 ? "text-muted-foreground" : "text-primary"}>
          {missing === 0 ? "completo" : missing === 1 ? "falta 1" : `faltan ${missing}`}
        </span>
      </p>
    </div>
  );
}
