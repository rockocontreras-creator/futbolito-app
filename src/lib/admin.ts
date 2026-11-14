// Reglas del panel de administración (CLAUDE.md §5.9). Funciones puras.

export type UserRole = "PLAYER" | "ORGANIZER" | "ADMIN";

export const ROLE_LABEL: Record<UserRole, string> = {
  PLAYER: "Jugador",
  ORGANIZER: "Organizador",
  ADMIN: "Admin",
};

/** Admin fijado por la variable ADMIN_EMAILS: vuelve a ser admin cada vez que entra, así que no se puede bajar desde el panel. */
export function isProtectedAdmin(email: string | null | undefined, adminEmails: readonly string[]): boolean {
  return Boolean(email) && adminEmails.includes(email!.toLowerCase());
}

/** Por qué no se puede cambiar el rol o suspender a esta cuenta; null si se puede. */
export function userChangeProblem(p: {
  actorId: string;
  targetId: string;
  targetRole: UserRole;
  targetEmail: string | null | undefined;
  adminEmails: readonly string[];
  action: "role" | "suspend";
}): string | null {
  if (p.actorId === p.targetId) return "No puedes cambiar tu propia cuenta desde acá.";
  if (isProtectedAdmin(p.targetEmail, p.adminEmails)) {
    return "Esa cuenta es admin fija (variable ADMIN_EMAILS). Se cambia en Vercel.";
  }
  if (p.action === "suspend" && p.targetRole === "ADMIN") return "Primero quítale el rol de admin.";
  return null;
}
