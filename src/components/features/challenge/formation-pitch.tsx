import { Plus } from "lucide-react";
import type { PitchSlot } from "@/lib/formation";
import { cn } from "@/lib/utils";

export interface PitchPlayer {
  name: string;
  photo?: string | null;
  guest?: boolean;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * Cancha con los puestos de una formación. El arco propio va abajo. Si viene `onSlotClick`, cada puesto es
 * un botón (para el capitán); si no, es solo un dibujo con los nombres.
 */
export function FormationPitch({
  slots,
  players,
  selected,
  onSlotClick,
  className,
}: {
  slots: PitchSlot[];
  players: ReadonlyMap<number, PitchPlayer>;
  selected?: number | null;
  onSlotClick?: (slot: number) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl bg-(--cancha)",
        className,
      )}
    >
      <svg
        viewBox="0 0 400 500"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full text-white/30"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        aria-hidden
      >
        <rect x="12" y="12" width="376" height="476" rx="6" />
        <line x1="12" y1="250" x2="388" y2="250" />
        <circle cx="200" cy="250" r="46" />
        <rect x="110" y="418" width="180" height="70" />
        <rect x="110" y="12" width="180" height="70" />
      </svg>
      <ul className="absolute inset-0">
        {slots.map((s) => {
          const player = players.get(s.slot);
          const isSelected = selected === s.slot;
          const marker = (
            <>
              <span
                className={cn(
                  "grid size-11 place-items-center overflow-hidden rounded-full border-2 text-sm font-extrabold",
                  player
                    ? player.guest
                      ? "border-white bg-foco text-accent-foreground"
                      : "border-white bg-white text-(--cancha)"
                    : "border-dashed border-white/70 bg-black/15 text-white",
                  isSelected && "ring-4 ring-foco",
                )}
              >
                {player ? (
                  player.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- fotos externas (Google/Supabase)
                    <img
                      src={player.photo}
                      alt=""
                      className="size-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    initials(player.name)
                  )
                ) : onSlotClick ? (
                  <Plus className="size-5" aria-hidden strokeWidth={3} />
                ) : (
                  <span className="text-[12px]">{s.role.slice(0, 3).toUpperCase()}</span>
                )}
              </span>
              <span className="max-w-[4.6rem] truncate rounded-md bg-black/50 px-1.5 py-0.5 text-[12px] leading-tight font-bold text-white">
                {player ? player.name : s.role}
              </span>
            </>
          );
          const label = player
            ? `${s.role}: ${player.name}${player.guest ? " (invitado)" : ""}`
            : `${s.role}: puesto vacío`;
          return (
            <li
              key={s.slot}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              {onSlotClick ? (
                <button
                  type="button"
                  onClick={() => onSlotClick(s.slot)}
                  aria-pressed={isSelected}
                  aria-label={label}
                  className="flex flex-col items-center gap-0.5 rounded-xl focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:outline-none"
                >
                  {marker}
                </button>
              ) : (
                <span className="flex flex-col items-center gap-0.5" aria-label={label}>
                  {marker}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
