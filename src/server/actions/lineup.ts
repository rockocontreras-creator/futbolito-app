"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getFormation, sanitizeLineup, slotsFor } from "@/lib/formation";
import { saveLineupSchema } from "@/lib/validations/challenge";
import { runAction } from "@/server/action-result";
import { AuthError, requireTeamCaptain } from "@/server/permissions";

/**
 * Guarda la formación de un equipo para un partido. Solo su capitán. En cada puesto va alguien del plantel
 * o un invitado sin cuenta (solo el nombre): los invitados no tienen rango ni estadísticas.
 */
export async function saveLineup(input: unknown) {
  return runAction(saveLineupSchema, input, async ({ matchId, teamId, formation, slots }) => {
    await requireTeamCaptain(teamId);
    const match = await db.match.findFirst({
      where: {
        id: matchId,
        deletedAt: null,
        type: { not: "PICKUP" },
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      select: { status: true, playersPerSide: true, homeTeamId: true },
    });
    if (!match) throw new AuthError("Ese partido no es de tu equipo.");
    if (match.status === "CANCELLED" || match.status === "RESULT_CONFIRMED") {
      throw new AuthError("Este partido ya está cerrado: la formación no se puede cambiar.");
    }

    const members = await db.teamMember.findMany({
      where: { teamId, leftAt: null },
      select: { userId: true },
    });
    const chosen = getFormation(formation, match.playersPerSide);
    const clean = sanitizeLineup(slots, slotsFor(chosen).length, new Set(members.map((m) => m.userId)));
    const side = match.homeTeamId === teamId ? "A" : "B";

    await db.matchLineup.upsert({
      where: { matchId_side: { matchId, side } },
      create: { matchId, side, formation: chosen.key, slots: clean },
      update: { formation: chosen.key, slots: clean },
    });
    refresh();
    return { filled: clean.length, guests: clean.filter((e) => e.guest).length };
  });
}
