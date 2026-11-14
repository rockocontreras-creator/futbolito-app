"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/canchas", label: "Canchas" },
  { href: "/admin/partidos", label: "Partidos" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/sectores", label: "Sectores" },
] as const;

type Badges = Partial<Record<(typeof tabs)[number]["href"], number>>;

// usePathname solo existe en tiempo de request: el fallback va sin pestaña activa.
export function AdminNav({ badges = {} }: { badges?: Badges }) {
  return (
    <Suspense fallback={<View active={null} badges={badges} />}>
      <Live badges={badges} />
    </Suspense>
  );
}

function Live({ badges }: { badges: Badges }) {
  return <View active={usePathname()} badges={badges} />;
}

function View({ active, badges }: { active: string | null; badges: Badges }) {
  return (
    <nav aria-label="Panel de administración" className="-mx-4 overflow-x-auto px-4 pb-1">
      <ul className="flex gap-2">
        {tabs.map(({ href, label }) => {
          const on = active === href;
          const n = badges[href] ?? 0;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-[15px] font-extrabold whitespace-nowrap transition-colors",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                {n > 0 && (
                  <span
                    className={cn(
                      "grid min-w-6 place-items-center rounded-lg px-1.5 text-sm",
                      on ? "bg-white/25" : "bg-foco text-accent-foreground",
                    )}
                  >
                    {n}
                    <span className="sr-only"> por revisar</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
