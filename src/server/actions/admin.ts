"use server";

import { refresh } from "next/cache";
import { adminEmails } from "@/lib/auth";
import { userChangeProblem } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  adminMatchSchema,
  createSectorSchema,
  resolveResultSchema,
  reviewVenueSchema,
  setRoleSchema,
  setSuspendedSchema,
  updateSectorSchema,
} from "@/lib/validations/admin";
import { runAction } from "@/server/action-result";
import { AuthError, requireAdmin } from "@/server/permissions";
import { getActiveComuna } from "@/server/queries/zones";
import { forceConfirmResult } from "@/server/services/finalize-results";
import { notifyUsers } from "@/server/services/notify";

// Panel de administración (CLAUDE.md §5.9). Toda acción parte con requireAdmin().

/** Aprobar o rechazar una cancha propuesta. */
export async function reviewVenue(input: unknown) {
  return runAction(reviewVenueSchema, input, async ({ venueId, status }) => {
    await requireAdmin();
    const venue = await db.venue.findUnique({ where: { id: venueId } });
    if (!venue) throw new AuthError("Esa cancha ya no existe.");
    await db.venue.update({ where: { id: venueId }, data: { status } });
    if (venue.proposedById && venue.status === "PENDING") {
      await notifyUsers([venue.proposedById], {
        type: "SYSTEM",
        key: `venue:${venueId}:${status}`,
        title:
          status === "APPROVED"
            ? `Aprobamos la cancha ${venue.name}`
            : `No aprobamos la cancha ${venue.name}`,
        body:
          status === "APPROVED"
            ? "Ya aparece en el mapa para todos."
            : "Puede que ya exista o que falten datos. Puedes proponerla de nuevo.",
        href: "/canchas",
      });
    }
    refresh();
    return null;
  });
}

/** Cerrar un resultado pendiente o en disputa con el marcador que decide el admin. */
export async function resolveResult(input: unknown) {
  return runAction(resolveResultSchema, input, async ({ matchId, scoreA, scoreB }) => {
    await requireAdmin();
    const match = await db.match.findFirst({ where: { id: matchId, deletedAt: null, type: "PICKUP" } });
    if (!match) throw new AuthError("Ese partido no existe.");
    if (match.status !== "PLAYED" && match.status !== "DISPUTED") {
      throw new AuthError("Ese partido no tiene un resultado por resolver.");
    }
    if (match.scoreA !== scoreA || match.scoreB !== scoreB) {
      // Los goleadores reportados ya no calzan con el marcador corregido.
      await db.$transaction([
        db.goal.deleteMany({ where: { matchId } }),
        db.match.update({ where: { id: matchId }, data: { scoreA, scoreB } }),
      ]);
    }
    if (!(await forceConfirmResult(matchId)))
      throw new AuthError("No se pudo confirmar. Inténtalo de nuevo.");
    const players = await db.matchParticipant.findMany({
      where: { matchId, status: "ATTENDED" },
      select: { userId: true },
    });
    await notifyUsers(
      players.map((p) => p.userId),
      {
        type: "SYSTEM",
        key: `resolved:${matchId}`,
        title: `Resultado confirmado: ${scoreA}–${scoreB}`,
        body: "Lo cerró un administrador. Tu rango y estadísticas ya están actualizados.",
        href: `/partidos/${matchId}`,
      },
    );
    refresh();
    return null;
  });
}

/** Anular un partido: no cuenta para el rango. No se puede si el resultado ya se confirmó. */
export async function cancelMatchAsAdmin(input: unknown) {
  return runAction(adminMatchSchema, input, async ({ matchId }) => {
    await requireAdmin();
    const match = await db.match.findFirst({ where: { id: matchId, deletedAt: null } });
    if (!match) throw new AuthError("Ese partido no existe.");
    if (match.status === "RESULT_CONFIRMED") {
      throw new AuthError("Ese resultado ya movió los rangos; no se puede anular.");
    }
    if (match.status === "CANCELLED") return null;
    await db.match.update({ where: { id: matchId }, data: { status: "CANCELLED" } });
    const players = await db.matchParticipant.findMany({
      where: { matchId, status: { in: ["REGISTERED", "WAITLIST", "ATTENDED"] } },
      select: { userId: true },
    });
    await notifyUsers(
      players.map((p) => p.userId),
      {
        type: "SYSTEM",
        key: `cancelled:${matchId}`,
        title: "Se anuló un partido en el que estabas",
        body: "Lo anuló un administrador. No cuenta para el rango.",
        href: `/partidos/${matchId}`,
      },
    );
    refresh();
    return null;
  });
}

async function targetFor(action: "role" | "suspend", actorId: string, userId: string) {
  const target = await db.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!target) throw new AuthError("Esa cuenta no existe.");
  const problem = userChangeProblem({
    actorId,
    targetId: target.id,
    targetRole: target.role,
    targetEmail: target.email,
    adminEmails: adminEmails(),
    action,
  });
  if (problem) throw new AuthError(problem);
  return target;
}

/** Cambiar el rol de una cuenta: jugador, organizador de liga o admin. */
export async function setUserRole(input: unknown) {
  return runAction(setRoleSchema, input, async ({ userId, role }) => {
    const admin = await requireAdmin();
    await targetFor("role", admin.id, userId);
    await db.user.update({ where: { id: userId }, data: { role } });
    refresh();
    return null;
  });
}

/** Suspender o reactivar una cuenta. Suspendida no puede entrar ni hacer nada. */
export async function setUserSuspended(input: unknown) {
  return runAction(setSuspendedSchema, input, async ({ userId, suspended }) => {
    const admin = await requireAdmin();
    await targetFor("suspend", admin.id, userId);
    await db.user.update({ where: { id: userId }, data: { suspendedAt: suspended ? new Date() : null } });
    refresh();
    return null;
  });
}

/** Agregar un sector (villa, población, localidad) a la comuna activa. */
export async function createSector(input: unknown) {
  return runAction(createSectorSchema, input, async ({ name }) => {
    await requireAdmin();
    const comuna = await getActiveComuna();
    if (!comuna) throw new AuthError("No hay comuna activa.");
    const dup = await db.sector.findFirst({
      where: { comunaId: comuna.id, name: { equals: name, mode: "insensitive" } },
    });
    if (dup) throw new AuthError("Ya existe un sector con ese nombre.");
    await db.sector.create({ data: { name, comunaId: comuna.id } });
    refresh();
    return null;
  });
}

/** Renombrar un sector u ocultarlo de los formularios (los perfiles que lo tenían lo conservan). */
export async function updateSector(input: unknown) {
  return runAction(updateSectorSchema, input, async ({ sectorId, name, isActive }) => {
    await requireAdmin();
    const sector = await db.sector.findUnique({ where: { id: sectorId } });
    if (!sector) throw new AuthError("Ese sector ya no existe.");
    if (name && name.toLowerCase() !== sector.name.toLowerCase()) {
      const dup = await db.sector.findFirst({
        where: {
          comunaId: sector.comunaId,
          name: { equals: name, mode: "insensitive" },
          id: { not: sectorId },
        },
      });
      if (dup) throw new AuthError("Ya existe un sector con ese nombre.");
    }
    await db.sector.update({
      where: { id: sectorId },
      data: { ...(name ? { name } : {}), ...(isActive === undefined ? {} : { isActive }) },
    });
    refresh();
    return null;
  });
}
