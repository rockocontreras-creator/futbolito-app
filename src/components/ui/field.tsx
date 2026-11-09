import * as React from "react";
import { cn } from "@/lib/utils";

/** Etiqueta + control + ayuda/error, con los ids conectados para lectores de pantalla. */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-semibold">
        {label}
        {optional && <span className="text-xs font-normal text-muted-foreground">Opcional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
