import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = { title: "Revisa tu correo" };

export default function CheckEmailPage() {
  return (
    <Container className="grid min-h-[60vh] place-items-center py-10">
      <div className="max-w-sm space-y-3 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-primary">
          <MailCheck className="size-7" aria-hidden />
        </span>
        <h1 className="text-4xl font-display text-foreground">Revisa tu correo</h1>
        <p className="text-muted-foreground">
          Te mandamos un enlace para entrar. Ábrelo desde este mismo teléfono o computador. Si no llega en un
          par de minutos, mira en spam.
        </p>
      </div>
    </Container>
  );
}
