"use client";

import { Home, PlusCircle, Search, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/partidos", label: "Partidos", icon: Search },
  { href: "/publicar", label: "Publicar", icon: PlusCircle },
  { href: "/ligas", label: "Ligas", icon: Trophy },
  { href: "/perfil", label: "Perfil", icon: User },
] as const;

// En escritorio hay espacio para todo; en móvil "Equipos" se alcanza desde Ligas, la portada y el pie.
const topItems = [
  { href: "/partidos", label: "Partidos" },
  { href: "/equipos", label: "Equipos" },
  { href: "/ligas", label: "Ligas" },
  { href: "/publicar", label: "Publicar" },
  { href: "/perfil", label: "Perfil" },
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
    <nav aria-label="Principal" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {topItems.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground",
                isActive(href) && "bg-secondary text-foreground",
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
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          const featured = href === "/publicar";
          return (
            <li key={href} className="flex justify-center">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 pt-2 pb-2.5 text-[11px] font-semibold text-muted-foreground",
                  active && "text-primary",
                )}
              >
                {featured ? (
                  <span className="-mt-5 grid size-12 place-items-center rounded-full bg-foco text-[#2a2205] shadow-[0_6px_16px_-6px_rgb(14_90_54/0.6)] ring-4 ring-card">
                    <Icon className="size-6" aria-hidden />
                  </span>
                ) : (
                  <Icon className="size-[22px]" aria-hidden strokeWidth={active ? 2.4 : 2} />
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
