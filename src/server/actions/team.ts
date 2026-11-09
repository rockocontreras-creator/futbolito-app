"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { nextFreeSlug, slugify } from "@/lib/slug";
import { createTeamSchema, teamIdSchema, teamRequestSchema } from "@/lib/validations/team";
import { runAction } from "@/server/action-result";
import { AuthError, requireTeamCaptain, requireUser } from "@/server/permissions";

async function requireProfile() {
  const user = await requireUser();
  const profile = await db.playerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) throw new AuthError("Primero crea tu perfil de jugador.");
  return { user, profile };
}

/** Crea un equipo. Quien lo crea queda como capitán. */
export async function createTeam(input: unknown) {
  return runAction(createTeamSchema, input, async (data) => {
    const { user, profile } = await requireProfile();

    const base = slugify(data.name);
    const taken = await db.team.findMany({
      where: { slug: { startsWith: base || "equipo" } },
      select: { slug: true },
    });
    const slug = nextFreeSlug(
      base,
      taken.map((t) => t.slug),
    );

    const team = await db.team.create({
      data: {
        name: data.name,
        slug,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        description: data.description || null,
        comunaId: profile.comunaId,
        sectorId: profile.sectorId,
        members: { create: { userId: user.id, role: "CAPTAIN" } },
      },
    });
    return { slug: team.slug };
  });
}

/** Pedir unirse a un equipo. El capitán acepta o rechaza desde la página del equipo. */
export async function requestToJoin(input: unknown) {
  return runAction(teamIdSchema, input, async ({ teamId }) => {
    const { user } = await requireProfile();
    const team = await db.team.findFirst({ where: { id: teamId, deletedAt: null } });
    if (!team) throw new AuthError("Ese equipo no existe.");

    const member = await db.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: user.id } } });
    if (member && !member.leftAt) throw new AuthError("Ya eres parte de este equipo.");

    const pending = await db.teamInvitation.findFirst({
      where: { teamId, senderId: user.id, kind: "REQUEST", status: "PENDING" },
    });
    if (pending) throw new AuthError("Ya pediste unirte. Falta que el capitán responda.");

    await db.teamInvitation.create({ data: { teamId, kind: "REQUEST", senderId: user.id } });
    refresh();
    return { requested: true };
  });
}

/** El capitán acepta o rechaza una solicitud. */
export async function answerJoinRequest(input: unknown) {
  return runAction(teamRequestSchema, input, async ({ requestId, accept }) => {
    const request = await db.teamInvitation.findFirst({
      where: { id: requestId, kind: "REQUEST", status: "PENDING" },
    });
    if (!request) throw new AuthError("Esa solicitud ya fue respondida.");
    await requireTeamCaptain(request.teamId);

    await db.$transaction(async (tx) => {
      await tx.teamInvitation.update({
        where: { id: request.id },
        data: { status: accept ? "ACCEPTED" : "REJECTED", respondedAt: new Date() },
      });
      if (accept) {
        await tx.teamMember.upsert({
          where: { teamId_userId: { teamId: request.teamId, userId: request.senderId } },
          create: { teamId: request.teamId, userId: request.senderId, role: "PLAYER" },
          update: { leftAt: null, role: "PLAYER", joinedAt: new Date() },
        });
      }
    });
    refresh();
    return { accepted: accept };
  });
}

/** Salir del equipo. El último capitán no puede irse dejando al equipo sin capitán. */
export async function leaveTeam(input: unknown) {
  return runAction(teamIdSchema, input, async ({ teamId }) => {
    const user = await requireUser();
    const member = await db.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: user.id } } });
    if (!member || member.leftAt) throw new AuthError("No eres parte de este equipo.");

    if (member.role === "CAPTAIN") {
      const captains = await db.teamMember.count({ where: { teamId, role: "CAPTAIN", leftAt: null } });
      const others = await db.teamMember.count({ where: { teamId, leftAt: null, NOT: { userId: user.id } } });
      if (captains === 1 && others > 0) {
        throw new AuthError("Eres el único capitán. Nombra a otro capitán antes de salir.");
      }
    }
    await db.teamMember.update({ where: { id: member.id }, data: { leftAt: new Date() } });
    refresh();
    return { left: true };
  });
}

/** El capitán nombra capitán a otro jugador del plantel. */
export async function makeCaptain(input: unknown) {
  return runAction(teamIdSchema.extend({ userId: teamIdSchema.shape.teamId }), input, async (data) => {
    await requireTeamCaptain(data.teamId);
    const member = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId: data.teamId, userId: data.userId } },
    });
    if (!member || member.leftAt) throw new AuthError("Ese jugador no está en el equipo.");
    await db.teamMember.update({ where: { id: member.id }, data: { role: "CAPTAIN" } });
    refresh();
    return { ok: true };
  });
}
