import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { CONTACT_EMAIL } from "@/config/site";

/** Página de texto legal: título, fecha y secciones cortas. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <Container className="max-w-2xl space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="text-5xl font-display text-primary">{title}</h1>
        <p className="text-sm text-muted-foreground">Última actualización: {updated}</p>
      </header>
      <div className="space-y-8 leading-relaxed">{children}</div>
    </Container>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="space-y-3 text-muted-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}

export function ContactLine() {
  return CONTACT_EMAIL ? (
    <p>
      Escríbenos a{" "}
      <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-primary underline underline-offset-4">
        {CONTACT_EMAIL}
      </a>
      .
    </p>
  ) : (
    <p>Escríbele a quien administra la página y lo resolvemos.</p>
  );
}
