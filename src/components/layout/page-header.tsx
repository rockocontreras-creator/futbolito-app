import type { ReactNode } from "react";

/** Título de página: redondo y grande, con bajada opcional y acción a la derecha. */
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
        <h1 className="text-[2rem] font-display sm:text-[2.5rem]">{title}</h1>
        {description && <p className="max-w-xl text-[17px] text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
