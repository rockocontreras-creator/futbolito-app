import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Torneos" };

export default function TournamentsPage() {
  return (
    <>
      <section className="chalk-pitch text-white">
        <Container className="grid min-h-[56vh] place-items-center py-16 text-center">
          <div className="max-w-xl space-y-5">
            <span className="mx-auto grid size-20 place-items-center rounded-full bg-foco text-[#2a2205] shadow-lg">
              <Trophy className="size-10" aria-hidden />
            </span>
            <p className="text-sm font-bold text-foco">Próximamente</p>
            <h1 className="text-6xl font-display sm:text-7xl">Torneos</h1>
            <p className="text-lg text-white/85">
              Campeonatos de un fin de semana con grupos, eliminación directa y premio. Estamos armando la
              cancha.
            </p>
          </div>
        </Container>
      </section>
      <Container className="max-w-xl space-y-4 py-8 text-center">
        <p className="text-muted-foreground">
          Mientras tanto, arma tu equipo para estar listo cuando abran las inscripciones.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/equipos/nuevo">Crear mi equipo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/ranking?tab=equipos">Ver clasificación de equipos</Link>
          </Button>
        </div>
      </Container>
    </>
  );
}
