import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AdminNav } from "@/components/features/admin/admin-nav";
import { SignInRequired } from "@/components/features/auth/sign-in-required";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { adminCounts, getAdmin } from "@/server/queries/admin";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Administración", robots: { index: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Container className="max-w-5xl pt-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border-2 bg-card" aria-hidden />}>
        <Gate>{children}</Gate>
      </Suspense>
    </Container>
  );
}

/** Solo administradores. Las acciones vuelven a revisar el permiso en el servidor. */
async function Gate({ children }: { children: ReactNode }) {
  const admin = await getAdmin();
  if (!admin) {
    const user = await getCurrentUser();
    if (!user) {
      return (
        <SignInRequired
          next="/admin"
          title="Ingresa para administrar"
          text="Esta parte es solo para quienes administran el club."
        />
      );
    }
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border-2 bg-card p-8 text-center">
        <h1 className="text-2xl font-display">Esta parte es solo para administradores</h1>
        <p className="text-muted-foreground">Tu cuenta no tiene ese permiso.</p>
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }
  const counts = await adminCounts();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Administración"
        description="Canchas, resultados, reportes, cuentas y sectores del club."
      />
      <AdminNav
        badges={{
          "/admin/canchas": counts.pendingVenues,
          "/admin/partidos": counts.disputed + counts.pendingResults,
          "/admin/reportes": counts.openReports,
        }}
      />
      {children}
    </div>
  );
}
