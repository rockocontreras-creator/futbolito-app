import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border-2 border-dashed bg-secondary/40 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="grid size-14 place-items-center rounded-2xl border-2 bg-card text-primary">
        <Icon className="size-7" aria-hidden strokeWidth={2.4} />
      </span>
      <h3 className="mt-4 text-xl font-extrabold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-[15px] text-muted-foreground">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
