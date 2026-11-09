import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="grid min-h-[60vh] place-items-center py-10">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-[7rem] font-display leading-none text-cancha/20 dark:text-white/20">404</p>
        <h1 className="text-4xl font-display text-cancha dark:text-white">
          Esta página quedó fuera de la cancha
        </h1>
        <p className="text-muted-foreground">El link puede estar mal escrito o el partido ya no existe.</p>
        <div className="flex justify-center gap-2 pt-2">
          <Button asChild>
            <Link href="/partidos">Ver partidos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
