import type { ReactNode } from "react";

/** Título de página: condensado y grande, con bajada opcional y acción a la derecha. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
      <div className="space-y-2">
        <h1 className="text-[2.6rem] font-display text-cancha sm:text-5xl dark:text-white">{title}</h1>
        {description && <p className="max-w-xl text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
