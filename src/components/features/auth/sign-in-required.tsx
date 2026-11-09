import { LogIn, UserRound } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Lo que ve alguien que entra a una página que pide sesión o perfil. */
export function SignInRequired({ next, title, text }: { next: string; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-primary">
        <LogIn className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-xl font-bold">{title}</h2>
      <p className="mt-1 text-[15px] text-muted-foreground">{text}</p>
      <Button asChild size="lg" className="mt-6 w-full">
        <Link href={`/ingresar?callbackUrl=${encodeURIComponent(next)}`}>Ingresar</Link>
      </Button>
    </div>
  );
}

export function ProfileRequired({ next }: { next: string }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-primary">
        <UserRound className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-xl font-bold">Primero, tu perfil de jugador</h2>
      <p className="mt-1 text-[15px] text-muted-foreground">
        Tu posición y nivel definen tu rango inicial. Es un minuto y lo haces una sola vez.
      </p>
      <Button asChild size="lg" className="mt-6 w-full">
        <Link href={`/perfil?volver=${encodeURIComponent(next)}`}>Crear mi perfil</Link>
      </Button>
    </div>
  );
}
