import { CalendarSearch, MapPin, Medal, Shield, Trophy, User, UserSearch, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Más" };

const sections = [
  { href: "/perfil", icon: User, title: "Mi perfil", text: "Foto, rango, apodos y comentarios" },
  { href: "/partidos", icon: CalendarSearch, title: "Partidos", text: "Revoltijos para sumarse" },
  { href: "/se-busca", icon: UserSearch, title: "Se busca", text: "Equipos a los que les falta gente" },
  { href: "/canchas", icon: MapPin, title: "Canchas", text: "Mapa y cómo llegar" },
  { href: "/ranking", icon: Medal, title: "Clasificación", text: "Los de mejor rango" },
  { href: "/equipos", icon: Shield, title: "Equipos", text: "Arma el tuyo o únete a uno" },
  { href: "/ligas", icon: Users, title: "Ligas", text: "Temporadas y tabla" },
  { href: "/torneos", icon: Trophy, title: "Torneos", text: "Próximamente" },
] as const;

export default function MorePage() {
  return (
    <Container className="max-w-2xl pt-8">
      <PageHeader title="Más" />
      <ul className="grid gap-3 sm:grid-cols-2">
        {sections.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-bold">{title}</span>
                <span className="text-sm text-muted-foreground">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 flex justify-center gap-5 text-sm text-muted-foreground">
        <Link href="/privacidad" className="underline underline-offset-4 hover:text-foreground">
          Privacidad
        </Link>
        <Link href="/terminos" className="underline underline-offset-4 hover:text-foreground">
          Términos de uso
        </Link>
      </p>
    </Container>
  );
}
