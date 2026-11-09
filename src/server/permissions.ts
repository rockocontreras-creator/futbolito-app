import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Permisos SIEMPRE en el servidor (CLAUDE.md §8). Lanzan AuthError; las Server Actions
// lo capturan con `runAction` y lo devuelven como { ok: false, error }.

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "SUSPENDED" = "FORBIDDEN",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new AuthError("Tienes que iniciar sesión.", "UNAUTHENTICATED");

  const user = await db.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw new AuthError("Tienes que iniciar sesión.", "UNAUTHENTICATED");
  if (user.suspendedAt) throw new AuthError("Tu cuenta está suspendida.", "SUSPENDED");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("Solo administradores.");
  return user;
}

export async function requireOrganizer() {
  const user = await requireUser();
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") throw new AuthError("Solo organizadores de liga.");
  return user;
}

export async function requireTeamCaptain(teamId: string) {
  const user = await requireUser();
  const membership = await db.teamMember.findFirst({
    where: { teamId, userId: user.id, role: "CAPTAIN", leftAt: null, team: { deletedAt: null } },
  });
  if (!membership) throw new AuthError("Solo el capitán puede hacer esto.");
  return { user, membership };
}
