import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            ⚽
          </span>
          {APP_NAME}
        </Link>
        <Button asChild size="sm" variant="outline">
          <Link href="/ingresar">Ingresar</Link>
        </Button>
      </div>
    </header>
  );
}
