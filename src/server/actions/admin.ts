"use server";

import { refresh } from "next/cache";
import { adminEmails } from "@/lib/auth";
import { ROLE_LABEL, userChangeProblem } from "@/lib/admin";
import { MAX_BROADCASTS_PER_DAY } from "@/lib/admin-log";
import { db } from "@/lib/db";
import { formatMatchDate } from "@/lib/format";
import {
  adminMatchSchema,
  adminTeamSchema,
  broadcastSchema,
  createSectorSchema,
  deleteContentSchema,
  updateMatchSchema,
  updateProfileAsAdminSchema,
  updateTeamSchema,
  resolveResultSchema,
  reviewVenueSchema,
  setRoleSchema,
  setSuspendedSchema,
  updateSectorSchema,
} from "@/lib/validations/admin";
import { runAction } from "@/server/action-result";
import { AuthError, requireAdmin } from "@/server/permissions";
import { getActiveComuna } from "@/server/queries/zones";
import { logAdmin } from "@/server/services/admin-log";
import { removeAvatarByUrl } from "@/server/storage";
import { forceConfirmResult } from "@/server/services/finalize-results";
import { notifyUsers } from "@/server/services/notify";
import { finalizeTeamMatch, teamPlayerIds } from "@/server/services/team-match";

// Panel de administración (CLAUDE.md §5.9). Toda acción parte con requireAdmin().

/** Aprobar o rechazar una cancha propuesta. */
export async function reviewVenue(input: unknown) {
  return runAction(reviewVenueSchema, input, async ({ venueId, status }) => {
    const admin = await requireAdmin();
    const venue = await db.venue.findUnique({ where: { id: venueId } });
    if (!venue) throw new AuthError("Esa cancha ya no existe.");
    await db.venue.update({ where: { id: venueId }, data: { status } });
    await logAdmin(
      admin.id,
      "venue",
      `${status === "APPROVED" ? "Aprobó" : venue.status === "APPROVED" ? "Quitó del mapa" : "Rechazó"} la cancha ${venue.name}`,
      venueId,
    );
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
    const admin = await requireAdmin();
    const match = await db.match.findFirst({ where: { id: matchId, deletedAt: null } });
    if (!match) throw new AuthError("Ese partido no existe.");
    const logIt = () =>
      logAdmin(
        admin.id,
        "result",
        `Confirmó el resultado ${scoreA}–${scoreB} del partido del ${formatMatchDate(match.startsAt)}`,
        matchId,
      );
    if (match.status !== "PLAYED" && match.status !== "DISPUTED") {
      throw new AuthError("Ese partido no tiene un resultado por resolver.");
    }
    const notice = {
      type: "SYSTEM" as const,
      key: `resolved:${matchId}`,
      title: `Resultado confirmado: ${scoreA}–${scoreB}`,
      body: "Lo cerró un administrador. El rango y las estadísticas ya están actualizados.",
      href: `/partidos/${matchId}`,
    };

    if (match.type !== "PICKUP") {
      // Entre equipos: el admin fija el marcador y se aplica a los equipos y a quienes jugaron.
      if ((await finalizeTeamMatch(matchId, { scoreA, scoreB })) !== "CONFIRMED") {
        throw new AuthError("No se pudo confirmar. Inténtalo de nuevo.");
      }
      await notifyUsers(await teamPlayerIds([match.homeTeamId, match.awayTeamId]), notice);
      await logIt();
      refresh();
      return null;
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
      notice,
    );
    await logIt();
    refresh();
    return null;
  });
}

/** Anular un partido: no cuenta para el rango. No se puede si el resultado ya se confirmó. */
export async function cancelMatchAsAdmin(input: unknown) {
  return runAction(adminMatchSchema, input, async ({ matchId }) => {
    const admin = await requireAdmin();
    const match = await db.match.findFirst({ where: { id: matchId, deletedAt: null } });
    if (!match) throw new AuthError("Ese partido no existe.");
    if (match.status === "RESULT_CONFIRMED") {
      throw new AuthError("Ese resultado ya movió los rangos; no se puede anular.");
    }
    if (match.status === "CANCELLED") return null;
    await db.match.update({ where: { id: matchId }, data: { status: "CANCELLED" } });
    await logAdmin(admin.id, "match", `Anuló el partido del ${formatMatchDate(match.startsAt)}`, matchId);
    const players = await db.matchParticipant.findMany({
      where: { matchId, status: { in: ["REGISTERED", "WAITLIST", "ATTENDED"] } },
      select: { userId: true },
    });
    const teamPlayers = await teamPlayerIds([match.homeTeamId, match.awayTeamId]);
    await notifyUsers([...players.map((p) => p.userId), ...teamPlayers], {
      type: "SYSTEM",
      key: `cancelled:${matchId}`,
      title: "Se anuló un partido en el que estabas",
      body: "Lo anuló un administrador. No cuenta para el rango.",
      href: `/partidos/${matchId}`,
    });
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
    const target = await targetFor("role", admin.id, userId);
    await db.user.update({ where: { id: userId }, data: { role } });
    await logAdmin(
      admin.id,
      "user",
      `Cambió el rol de ${target.name ?? "una cuenta sin nombre"} a ${ROLE_LABEL[role]}`,
      userId,
    );
    refresh();
    return null;
  });
}

/** Suspender o reactivar una cuenta. Suspendida no puede entrar ni hacer nada. */
export async function setUserSuspended(input: unknown) {
  return runAction(setSuspendedSchema, input, async ({ userId, suspended }) => {
    const admin = await requireAdmin();
    const target = await targetFor("suspend", admin.id, userId);
    await db.user.update({ where: { id: userId }, data: { suspendedAt: suspended ? new Date() : null } });
    await logAdmin(
      admin.id,
      "user",
      `${suspended ? "Suspendió" : "Reactivó"} la cuenta de ${target.name ?? "una cuenta sin nombre"}`,
      userId,
    );
    refresh();
    return null;
  });
}

/** Agregar un sector (villa, población, localidad) a la comuna activa. */
export async function createSector(input: unknown) {
  return runAction(createSectorSchema, input, async ({ name }) => {
    const admin = await requireAdmin();
    const comuna = await getActiveComuna();
    if (!comuna) throw new AuthError("No hay comuna activa.");
    const dup = await db.sector.findFirst({
      where: { comunaId: comuna.id, name: { equals: name, mode: "insensitive" } },
    });
    if (dup) throw new AuthError("Ya existe un sector con ese nombre.");
    const sector = await db.sector.create({ data: { name, comunaId: comuna.id } });
    await logAdmin(admin.id, "sector", `Agregó el sector ${name}`, sector.id);
    refresh();
    return null;
  });
}

/** Renombrar un sector u ocultarlo de los formularios (los perfiles que lo tenían lo conservan). */
export async function updateSector(input: unknown) {
  return runAction(updateSectorSchema, input, async ({ sectorId, name, isActive }) => {
    const admin = await requireAdmin();
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
    await logAdmin(
      admin.id,
      "sector",
      isActive === undefined
        ? `Renombró el sector ${sector.name} a ${name}`
        : `${isActive ? "Volvió a mostrar" : "Ocultó"} el sector ${name ?? sector.name}`,
      sectorId,
    );
    refresh();
    return null;
  });
}

// ─────────────────────────────────────────────────────────────
// Editar y borrar
// ─────────────────────────────────────────────────────────────

async function matchPeople(match: { id: string; homeTeamId: string | null; awayTeamId: string | null }) {
  const players = await db.matchParticipant.findMany({
    where: { matchId: match.id, status: { in: ["REGISTERED", "WAITLIST"] } },
    select: { userId: true },
  });
  return [...players.map((p) => p.userId), ...(await teamPlayerIds([match.homeTeamId, match.awayTeamId]))];
}

/** Corregir un partido por jugar: fecha, cancha, cupos y notas. Se les avisa a los inscritos. */
export async function updateMatchAsAdmin(input: unknown) {
  return runAction(
    updateMatchSchema,
    input,
    async ({ matchId, startsAtLocal, venueId, maxPlayers, notes }) => {
      const admin = await requireAdmin();
      const match = await db.match.findFirst({ where: { id: matchId, deletedAt: null } });
      if (!match) throw new AuthError("Ese partido no existe.");
      if (!["OPEN", "FULL", "CONFIRMED"].includes(match.status) || match.startsAt <= new Date()) {
        throw new AuthError("Solo se pueden editar los partidos por jugar.");
      }
      if (!venueId && match.type === "PICKUP") throw new AuthError("Un revoltijo necesita cancha.");
      if (venueId) {
        const venue = await db.venue.findFirst({ where: { id: venueId, comunaId: match.comunaId } });
        if (!venue) throw new AuthError("Esa cancha no está disponible.");
      }

      let status = match.status;
      let capacity = match.maxPlayers;
      if (match.type === "PICKUP" && maxPlayers != null) {
        const registered = await db.matchParticipant.count({ where: { matchId, status: "REGISTERED" } });
        if (maxPlayers < registered) {
          throw new AuthError(`Ya hay ${registered} inscritos: los cupos no pueden ser menos.`);
        }
        if (maxPlayers < match.playersPerSide * 2) {
          throw new AuthError("Los cupos no alcanzan para dos equipos completos.");
        }
        capacity = maxPlayers;
        status = registered >= maxPlayers ? "FULL" : "OPEN";
      }

      const moved =
        startsAtLocal.getTime() !== match.startsAt.getTime() || (venueId || null) !== match.venueId;
      await db.match.update({
        where: { id: matchId },
        data: {
          startsAt: startsAtLocal,
          venueId: venueId || null,
          maxPlayers: capacity,
          notes: notes || null,
          status,
        },
      });
      if (moved) {
        // Cambió el día, la hora o la cancha: quien había confirmado tiene que volver a mirar.
        await db.matchParticipant.updateMany({ where: { matchId }, data: { goingAt: null } });
        await notifyUsers(await matchPeople(match), {
          type: "SYSTEM",
          key: `edited:${matchId}`,
          title: "Cambió un partido en el que estás",
          body: `Ahora es el ${formatMatchDate(startsAtLocal)}. Revisa el día, la hora y la cancha.`,
          href: `/partidos/${matchId}`,
        });
      }
      await logAdmin(admin.id, "match", `Editó el partido del ${formatMatchDate(startsAtLocal)}`, matchId);
      refresh();
      return null;
    },
  );
}

/** Borrar un partido: desaparece de la página. Un resultado confirmado no se borra (ya movió los rangos). */
export async function deleteMatchAsAdmin(input: unknown) {
  return runAction(adminMatchSchema, input, async ({ matchId }) => {
    const admin = await requireAdmin();
    const match = await db.match.findFirst({ where: { id: matchId, deletedAt: null } });
    if (!match) throw new AuthError("Ese partido ya no existe.");
    if (match.status === "RESULT_CONFIRMED") {
      throw new AuthError("Ese resultado ya movió los rangos; el partido no se puede borrar.");
    }
    const upcoming = ["OPEN", "FULL", "CONFIRMED"].includes(match.status) && match.startsAt > new Date();
    const people = upcoming ? await matchPeople(match) : [];
    await db.$transaction([
      db.match.update({ where: { id: matchId }, data: { deletedAt: new Date(), status: "CANCELLED" } }),
      db.challenge.updateMany({ where: { matchId }, data: { status: "CANCELLED" } }),
    ]);
    await notifyUsers(people, {
      type: "SYSTEM",
      key: `cancelled:${matchId}`,
      title: "Se anuló un partido en el que estabas",
      body: `El del ${formatMatchDate(match.startsAt)}. Lo borró un administrador.`,
      href: "/partidos",
    });
    await logAdmin(admin.id, "match", `Borró el partido del ${formatMatchDate(match.startsAt)}`, matchId);
    refresh();
    return null;
  });
}

/** Corregir el nombre o la descripción de un equipo. */
export async function updateTeamAsAdmin(input: unknown) {
  return runAction(updateTeamSchema, input, async ({ teamId, name, description }) => {
    const admin = await requireAdmin();
    const team = await db.team.findFirst({ where: { id: teamId, deletedAt: null } });
    if (!team) throw new AuthError("Ese equipo ya no existe.");
    const dup = await db.team.findFirst({
      where: {
        comunaId: team.comunaId,
        deletedAt: null,
        id: { not: teamId },
        name: { equals: name, mode: "insensitive" },
      },
    });
    if (dup) throw new AuthError("Ya hay otro equipo con ese nombre.");
    await db.team.update({ where: { id: teamId }, data: { name, description: description || null } });
    await logAdmin(
      admin.id,
      "team",
      name === team.name ? `Editó el equipo ${name}` : `Renombró el equipo ${team.name} a ${name}`,
      teamId,
    );
    refresh();
    return null;
  });
}

/** Borrar un equipo: desaparece, se cierran sus desafíos abiertos y se anulan sus partidos por jugar. */
export async function deleteTeamAsAdmin(input: unknown) {
  return runAction(adminTeamSchema, input, async ({ teamId }) => {
    const admin = await requireAdmin();
    const team = await db.team.findFirst({ where: { id: teamId, deletedAt: null } });
    if (!team) throw new AuthError("Ese equipo ya no existe.");
    const members = await teamPlayerIds([teamId]);
    const pending = await db.match.findMany({
      where: {
        deletedAt: null,
        status: { in: ["OPEN", "FULL", "CONFIRMED"] },
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      select: { id: true, homeTeamId: true, awayTeamId: true },
    });
    const rivals = await teamPlayerIds(
      pending.map((m) => (m.homeTeamId === teamId ? m.awayTeamId : m.homeTeamId)),
    );
    await db.$transaction([
      db.team.update({ where: { id: teamId }, data: { deletedAt: new Date() } }),
      db.match.updateMany({ where: { id: { in: pending.map((m) => m.id) } }, data: { status: "CANCELLED" } }),
      db.challenge.updateMany({
        where: { status: "OPEN", OR: [{ creatorTeamId: teamId }, { targetTeamId: teamId }] },
        data: { status: "CANCELLED" },
      }),
    ]);
    await notifyUsers([...members, ...rivals], {
      type: "SYSTEM",
      key: `team-deleted:${teamId}`,
      title: `Se eliminó el equipo ${team.name}`,
      body:
        pending.length > 0
          ? "Lo eliminó un administrador. Sus partidos por jugar quedaron anulados."
          : "Lo eliminó un administrador.",
      href: "/equipos",
    });
    await logAdmin(admin.id, "team", `Borró el equipo ${team.name}`, teamId);
    refresh();
    return null;
  });
}

/** Corregir el nombre o el apodo de un perfil, o quitarle la foto. */
export async function updateProfileAsAdmin(input: unknown) {
  return runAction(
    updateProfileAsAdminSchema,
    input,
    async ({ userId, displayName, nickname, removePhoto }) => {
      const admin = await requireAdmin();
      const profile = await db.playerProfile.findUnique({ where: { userId } });
      if (!profile) throw new AuthError("Esa cuenta no tiene perfil de jugador.");
      await db.playerProfile.update({
        where: { id: profile.id },
        data: { displayName, nickname: nickname || null, ...(removePhoto ? { photoUrl: null } : {}) },
      });
      if (removePhoto) await removeAvatarByUrl(profile.photoUrl).catch(() => null);
      const changes = [
        displayName !== profile.displayName ? `nombre (antes ${profile.displayName})` : null,
        (nickname || null) !== profile.nickname ? "apodo" : null,
        removePhoto && profile.photoUrl ? "quitó la foto" : null,
      ].filter(Boolean);
      await logAdmin(
        admin.id,
        "profile",
        `Editó el perfil de ${displayName}${changes.length ? `: ${changes.join(", ")}` : ""}`,
        userId,
      );
      refresh();
      return null;
    },
  );
}

/** Borrar un comentario de perfil o un mensaje de una sala. */
export async function deleteContentAsAdmin(input: unknown) {
  return runAction(deleteContentSchema, input, async ({ kind, contentId }) => {
    const admin = await requireAdmin();
    const authorName = (u: { name: string | null; profile: { displayName: string } | null }) =>
      u.profile?.displayName ?? u.name ?? "alguien sin nombre";
    const author = { select: { name: true, profile: { select: { displayName: true } } } };
    if (kind === "comment") {
      const comment = await db.profileComment.findFirst({
        where: { id: contentId, deletedAt: null },
        include: { author },
      });
      if (!comment) throw new AuthError("Ese comentario ya no existe.");
      await db.profileComment.update({ where: { id: contentId }, data: { deletedAt: new Date() } });
      await logAdmin(admin.id, "content", `Borró un comentario de ${authorName(comment.author)}`, contentId);
    } else {
      const message = await db.matchMessage.findFirst({
        where: { id: contentId, deletedAt: null },
        include: { user: author },
      });
      if (!message) throw new AuthError("Ese mensaje ya no existe.");
      await db.matchMessage.update({ where: { id: contentId }, data: { deletedAt: new Date() } });
      await logAdmin(
        admin.id,
        "content",
        `Borró un mensaje de ${authorName(message.user)} en una sala`,
        contentId,
      );
    }
    refresh();
    return null;
  });
}

/** Aviso para toda la comuna: llega a la campana y al celular de quienes tienen perfil. */
export async function broadcastNotice(input: unknown) {
  return runAction(broadcastSchema, input, async ({ title, body, href }) => {
    const admin = await requireAdmin();
    const comuna = await getActiveComuna();
    if (!comuna) throw new AuthError("No hay comuna activa.");
    const recent = await db.adminLog.count({
      where: { action: "broadcast", createdAt: { gte: new Date(Date.now() - 86400_000) } },
    });
    if (recent >= MAX_BROADCASTS_PER_DAY) {
      throw new AuthError(
        `Ya se mandaron ${MAX_BROADCASTS_PER_DAY} avisos en las últimas 24 horas. Espera un poco.`,
      );
    }
    const people = await db.user.findMany({
      where: { deletedAt: null, suspendedAt: null, profile: { comunaId: comuna.id } },
      select: { id: true },
    });
    const log = await logAdmin(
      admin.id,
      "broadcast",
      `Mandó un aviso a ${people.length} ${people.length === 1 ? "persona" : "personas"}: “${title}”${body ? ` — ${body}` : ""}`,
    );
    await notifyUsers(
      people.map((p) => p.id),
      {
        type: "SYSTEM",
        key: `broadcast:${log?.id ?? Date.now()}`,
        title,
        body: body || undefined,
        href: href || undefined,
      },
    );
    refresh();
    return { sent: people.length };
  });
}
