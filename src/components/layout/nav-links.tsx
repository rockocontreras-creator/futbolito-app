"use client";

import { LayoutGrid, Medal, Plus, Search, UserSearch } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

// Móvil: lo más usado abajo; el resto (canchas, equipos, ligas, torneos, perfil) vive en "Más".
const items = [
  { href: "/partidos", label: "Partidos", icon: Search },
  { href: "/se-busca", label: "Se busca", icon: UserSearch },
  { href: "/publicar", label: "Publicar", icon: Plus },
  { href: "/ranking", label: "Ranking", icon: Medal },
  { href: "/mas", label: "Más", icon: LayoutGrid },
] as const;

const topItems = [
  { href: "/partidos", label: "Partidos" },
  { href: "/se-busca", label: "Se busca" },
  { href: "/canchas", label: "Canchas" },
  { href: "/ranking", label: "Ranking" },
  { href: "/equipos", label: "Equipos" },
  { href: "/desafios", label: "Desafíos" },
  { href: "/torneos", label: "Torneos" },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

type IsActive = (href: string) => boolean;
const never: IsActive = () => false;

// usePathname solo existe en tiempo de request: el fallback (sin item activo) va en el HTML prerenderizado.
export function TopNav() {
  return (
    <Suspense fallback={<TopNavView isActive={never} />}>
      <TopNavLive />
    </Suspense>
  );
}

export function BottomNav() {
  return (
    <Suspense fallback={<BottomNavView isActive={never} />}>
      <BottomNavLive />
    </Suspense>
  );
}

function TopNavLive() {
  return <TopNavView isActive={useIsActive()} />;
}

function BottomNavLive() {
  return <BottomNavView isActive={useIsActive()} />;
}

/** Navegación de escritorio, en el header. */
function TopNavView({ isActive }: { isActive: IsActive }) {
  return (
    <nav aria-label="Principal" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {topItems.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "rounded-xl border-2 border-transparent px-3 py-2 text-[15px] font-extrabold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                isActive(href) && "border-primary/25 bg-secondary text-primary hover:text-primary",
              )}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Barra inferior tipo app, solo en móvil. "Publicar" va destacado al centro. */
function BottomNavView({ isActive }: { isActive: IsActive }) {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          const featured = href === "/publicar";
          return (
            <li key={href} className="flex justify-center">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full flex-col items-center gap-0.5 pt-2 pb-2 text-[13px] font-extrabold text-muted-foreground",
                  active && "text-primary",
                )}
              >
                {featured ? (
                  <span className="-mt-6 grid size-[52px] place-items-center rounded-2xl bg-foco text-accent-foreground ring-4 relieve ring-card [--relieve-color:var(--foco-canto)]">
                    <Icon className="size-7" aria-hidden strokeWidth={2.6} />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "grid h-9 w-14 place-items-center rounded-xl border-2 border-transparent",
                      active && "border-primary/25 bg-secondary",
                    )}
                  >
                    <Icon className="size-6" aria-hidden strokeWidth={active ? 2.6 : 2.2} />
                  </span>
                )}
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
