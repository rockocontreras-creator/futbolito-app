import { Search, Swords, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: Users, title: "Revoltijos", text: "¿No tienes con quién jugar? Súmate a una pichanga abierta." },
  { icon: Swords, title: "Desafíos", text: "Tu equipo busca rival. Publica y coordina en minutos." },
  { icon: Trophy, title: "Ligas", text: "Temporadas, fixture y tabla de posiciones." },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-2xl bg-primary px-5 py-8 text-primary-foreground">
        <p className="text-sm font-medium opacity-90">San Clemente · Región del Maule</p>
        <h1 className="text-3xl font-bold tracking-tight text-balance">¿Te sumas a la pichanga?</h1>
        <p className="max-w-prose opacity-90">
          Encuentra partidos cerca de ti, arma tu equipo y sube de división jugando.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="accent" size="lg">
            <Link href="/partidos">
              <Search aria-hidden /> Buscar pichanga
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Link href="/publicar">Publicar revoltijo</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="cerca" className="space-y-3">
        <h2 id="cerca" className="text-lg font-semibold">
          Partidos cerca de ti
        </h2>
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay partidos publicados. ¡Sé el primero en armar uno!
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="gap-2">
            <CardContent className="space-y-2">
              <Icon className="size-6 text-primary" aria-hidden />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
