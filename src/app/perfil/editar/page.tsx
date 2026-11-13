import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignInRequired } from "@/components/features/auth/sign-in-required";
import { ProfileForm } from "@/components/features/player/profile-form";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { db } from "@/lib/db";
import { listSectors } from "@/server/queries/zones";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Editar perfil" };

export default function EditProfilePage() {
  return (
    <Container className="max-w-3xl pt-8">
      <PageHeader title="Editar perfil" description="Tu rango no cambia acá: se mueve jugando." />
      <Suspense
        fallback={<div className="h-[640px] animate-pulse rounded-2xl border-2 bg-card" aria-hidden />}
      >
        <Edit />
      </Suspense>
    </Container>
  );
}

async function Edit() {
  const user = await getCurrentUser();
  if (!user) return <SignInRequired next="/perfil/editar" title="Ingresa para editar tu perfil" text="" />;
  const p = await db.playerProfile.findUnique({ where: { userId: user.id } });
  if (!p) redirect("/perfil");
  const sectors = await listSectors(p.comunaId);
  return (
    <ProfileForm
      defaultName={p.displayName}
      sectors={sectors}
      returnTo="/perfil"
      photo={p.photoUrl}
      initial={{
        username: p.username,
        displayName: p.displayName,
        nickname: p.nickname ?? "",
        birthDate: p.birthDate ? p.birthDate.toISOString().slice(0, 10) : "",
        gender: p.gender ?? "",
        phone: p.phone ?? "",
        sectorId: p.sectorId ?? "",
        primaryPosition: p.primaryPosition,
        secondaryPosition: p.secondaryPosition ?? "",
        foot: p.foot,
        skillLevel: p.skillLevel,
      }}
    />
  );
}
