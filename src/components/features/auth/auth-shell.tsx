import { Medal, Shuffle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/server/actions/auth";

const POINTS = [
  { icon: Users, text: "Súmate a revoltijos o publica el tuyo cuando falten jugadores." },
  { icon: Shuffle, text: "Equipos parejos armados según el rango de cada uno." },
  { icon: Medal, text: "Cada resultado confirmado mueve tu rango: de Bronce a Diamante." },
];

/** Pantallas de ingreso: en escritorio, la cancha a la izquierda y el formulario a la derecha. */
export function AuthShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden chalk-pitch p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="max-w-md space-y-8">
          <p className="text-6xl font-display text-balance">La pichanga de San Clemente, en un solo lugar.</p>
          <ul className="space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3 text-[17px] text-white/85">
                <Icon className="mt-0.5 size-5 shrink-0 text-foco" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="flex items-start justify-center px-4 py-10 sm:items-center lg:px-12">
        <div className="w-full max-w-sm space-y-7">
          <div className="space-y-2">
            <h1 className="text-5xl font-display text-cancha dark:text-white">{title}</h1>
            <p className="text-pretty text-muted-foreground">{intro}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function GoogleButton({
  callbackUrl,
  label = "Continuar con Google",
}: {
  callbackUrl: string;
  label?: string;
}) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Button type="submit" variant="outline" size="lg" className="w-full bg-card text-[16px]">
        <GoogleIcon /> {label}
      </Button>
    </form>
  );
}

export function OrDivider({ children = "o con tu correo" }: { children?: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-[13px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
      {children}
    </p>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"
      />
    </svg>
  );
}
