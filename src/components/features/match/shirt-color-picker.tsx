"use client";

import { SHIRT_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";

/** Fila de colores de camiseta/pechera para elegir con un toque. */
export function ShirtColorPicker({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {SHIRT_COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            onClick={() => onChange(c.hex)}
            aria-pressed={value.toLowerCase() === c.hex}
            aria-label={c.name}
            title={c.name}
            className={cn(
              "size-9 rounded-full border border-black/15 ring-offset-2 ring-offset-card outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
              value.toLowerCase() === c.hex && "ring-[3px] ring-primary",
            )}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-[13px] font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
