import Link from "next/link";
import { BrandMark } from "./brand";

export function SiteFooter() {
  return (
    <footer className="hidden border-t md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <BrandMark className="size-6" />
          <span>Hecho para las pichangas de San Clemente.</span>
        </div>
        <nav aria-label="Pie de página" className="flex gap-5">
          <Link href="/partidos" className="hover:text-foreground">
            Partidos
          </Link>
          <Link href="/equipos" className="hover:text-foreground">
            Equipos
          </Link>
          <Link href="/ligas" className="hover:text-foreground">
            Ligas
          </Link>
        </nav>
      </div>
    </footer>
  );
}
