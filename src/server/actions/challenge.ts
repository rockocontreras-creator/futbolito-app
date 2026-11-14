"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { formatMatchDate } from "@/lib/format";
import {
  acceptChallengeSchema,
  challengeIdSchema,
  createChallengeSchema,
  teamResultSchema,
} from "@/lib/validations/challenge";
import { runAction } from "@/server/action-result";
import { AuthError, requireTeamCaptain } from "@/server/permissions";
import { notifyUsers } from "@/server/services/notify";
import { finalizeTeamMatch, teamCaptainIds, teamPlayerIds } from "@/server/services/team-match";

/** Tope de desafíos abiertos por equipo, para que la lista no se llene de publicaciones viejas. */
const MAX_OPEN_PER_TEAM = 3;

/** Publicar "Buscamos rival". Si viene un rival, es un desafío directo a ese equipo. */
export async function createChallenge(input: unknown) {
  return runAction(createChallengeSchema, input, async (data) => {
    await requireTeamCaptain(data.teamId);
    const team = await db.team.findFirst({ where: { id: data.teamId, deletedAt: null } });
    if (!team) throw new AuthError("Ese equipo no existe.");

    const venue = data.venueId
      ? await db.venue.findFirst({ where: { id: data.venueId, comunaId: team.comunaId, status: "APPROVED" } })
      : null;
    if (data.venueId && !venue) throw new AuthError("Esa cancha no está disponible. Elige otra.");

    const rival = data.rivalSlug
      ? await db.team.findFirst({ where: { slug: data.rivalSlug, deletedAt: null, comunaId: team.comunaId } })
      : null;
    if (data.rivalSlug && !rival) throw new AuthError("No encontramos ese equipo rival.");
    if (rival?.id === team.id) throw new AuthError("Un equipo no puede desafiarse a sí mismo.");

    const open = await db.challenge.count({
      where: { creatorTeamId: team.id, status: "OPEN", windowStart: { gt: new Date() } },
    });
    if (open >= MAX_OPEN_PER_TEAM) {
      throw new AuthError(
        `Tu equipo ya tiene ${MAX_OPEN_PER_TEAM} desafíos abiertos. Cancela uno para publicar otro.`,
      );
    }

    const challenge = await db.challenge.create({
      data: {
        creatorTeamId: team.id,
        targetTeamId: rival?.id ?? null,
        windowStart: data.startsAtLocal,
        venueId: venue?.id ?? null,
        playersPerSide: data.playersPerSide,
        notes: data.notes || null,
      },
    });
    if (rival) {
      await notifyUsers(await teamCaptainIds(rival.id), {
        type: "CHALLENGE_PROPOSAL",
        key: `challenge:${challenge.id}`,
        title: `${team.name} desafió a ${rival.name}`,
        body: `${formatMatchDate(data.startsAtLocal)}${venue ? ` en ${venue.name}` : ""}. Acéptalo desde Desafíos.`,
        href: "/desafios",
      });
    }
    refresh();
    return { id: challenge.id };
  });
}

/** Aceptar un desafío con uno de mis equipos: se crea el partido entre ambos. */
export async function acceptChallenge(input: unknown) {
  return runAction(acceptChallengeSchema, input, async ({ challengeId, teamId }) => {
    await requireTeamCaptain(teamId);
    const match = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Challenge" WHERE id = ${challengeId} FOR UPDATE`;
      const challenge = await tx.challenge.findUnique({
        where: { id: challengeId },
        include: { creatorTeam: true },
      });
      if (!challenge || challenge.creatorTeam.deletedAt) throw new AuthError("Ese desafío ya no existe.");
      if (challenge.status !== "OPEN") throw new AuthError("Otro equipo ya tomó este desafío.");
      if (challenge.windowStart <= new Date()) throw new AuthError("Este desafío ya pasó.");
      if (challenge.creatorTeamId === teamId)
        throw new AuthError("No puedes aceptar el desafío de tu propio equipo.");
      if (challenge.targetTeamId && challenge.targetTeamId !== teamId) {
        throw new AuthError("Este desafío es para otro equipo.");
      }
      const rival = await tx.team.findFirst({ where: { id: teamId, deletedAt: null } });
      if (!rival) throw new AuthError("Ese equipo no existe.");
      if (rival.comunaId !== challenge.creatorTeam.comunaId) {
        throw new AuthError("Por ahora los desafíos son entre equipos de la misma comuna.");
      }
      // Quien queda como organizador: un capitán del equipo que publicó.
      const captain = await tx.teamMember.findFirst({
        where: { teamId: challenge.creatorTeamId, role: "CAPTAIN", leftAt: null },
        orderBy: { joinedAt: "asc" },
      });
      if (!captain) throw new AuthError("El equipo que publicó se quedó sin capitán.");

      const created = await tx.match.create({
        data: {
          type: "CHALLENGE",
          status: "CONFIRMED",
          comunaId: challenge.creatorTeam.comunaId,
          venueId: challenge.venueId,
          organizerId: captain.userId,
          startsAt: challenge.windowStart,
          playersPerSide: challenge.playersPerSide,
          notes: challenge.notes,
          homeTeamId: challenge.creatorTeamId,
          awayTeamId: teamId,
          ...(challenge.creatorTeam.primaryColor ? { colorA: challenge.creatorTeam.primaryColor } : {}),
          ...(rival.primaryColor && rival.primaryColor !== challenge.creatorTeam.primaryColor
            ? { colorB: rival.primaryColor }
            : {}),
        },
      });
      await tx.challenge.update({
        where: { id: challengeId },
        data: { status: "ACCEPTED", matchId: created.id },
      });
      return { ...created, home: challenge.creatorTeam.name, away: rival.name };
    });

    await notifyUsers(await teamPlayerIds([match.homeTeamId, match.awayTeamId]), {
      type: "CHALLENGE_ACCEPTED",
      key: `match:${match.id}`,
      title: `Hay partido: ${match.home} vs ${match.away}`,
      body: `${formatMatchDate(match.startsAt)}. Coordinen en la sala del partido.`,
      href: `/partidos/${match.id}`,
    });
    refresh();
    return { matchId: match.id };
  });
}

/** Cancelar un desafío que todavía nadie aceptó. */
export async function cancelChallenge(input: unknown) {
  return runAction(challengeIdSchema, input, async ({ challengeId }) => {
    const challenge = await db.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new AuthError("Ese desafío ya no existe.");
    await requireTeamCaptain(challenge.creatorTeamId);
    if (challenge.status !== "OPEN") throw new AuthError("Ese desafío ya no está abierto.");
    await db.challenge.update({ where: { id: challengeId }, data: { status: "CANCELLED" } });
    refresh();
    return null;
  });
}

/**
 * Resultado de un partido entre equipos. Cada capitán reporta el marcador y quiénes de su equipo
 * jugaron. Si los dos marcadores coinciden se confirma; si no, queda en disputa para el admin.
 */
export async function reportTeamResult(input: unknown) {
  return runAction(teamResultSchema, input, async ({ matchId, teamId, scoreHome, scoreAway, playerIds }) => {
    const { user } = await requireTeamCaptain(teamId);
    const match = await db.match.findFirst({
      where: { id: matchId, deletedAt: null, type: { not: "PICKUP" } },
      include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
    });
    if (!match) throw new AuthError("Ese partido no existe.");
    const side = match.homeTeamId === teamId ? "A" : match.awayTeamId === teamId ? "B" : null;
    if (!side) throw new AuthError("Tu equipo no juega este partido.");
    if (match.startsAt > new Date()) throw new AuthError("El partido todavía no se juega.");
    if (!["CONFIRMED", "PLAYED", "DISPUTED"].includes(match.status)) {
      throw new AuthError("Este partido ya no acepta resultados.");
    }
    const roster = await db.teamMember.findMany({
      where: { teamId, leftAt: null, userId: { in: playerIds } },
      select: { userId: true },
    });
    if (roster.length !== new Set(playerIds).size) {
      throw new AuthError("Marca solo a jugadores que están en tu plantel.");
    }

    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Match" WHERE id = ${matchId} FOR UPDATE`;
      await tx.resultReport.upsert({
        where: { matchId_side: { matchId, side } },
        create: { matchId, side, reporterId: user.id, scoreA: scoreHome, scoreB: scoreAway },
        update: { reporterId: user.id, scoreA: scoreHome, scoreB: scoreAway },
      });
      // La nómina de este lado: quiénes jugaron.
      await tx.matchParticipant.deleteMany({ where: { matchId, side } });
      await tx.matchParticipant.createMany({
        data: roster.map((r) => ({ matchId, userId: r.userId, side, status: "ATTENDED" as const })),
        skipDuplicates: true,
      });
      await tx.match.update({
        where: { id: matchId },
        data: { status: "PLAYED", scoreA: scoreHome, scoreB: scoreAway },
      });
    });

    const outcome = await finalizeTeamMatch(matchId);
    const title = `${match.homeTeam?.name ?? "Local"} ${scoreHome}–${scoreAway} ${match.awayTeam?.name ?? "Visita"}`;
    const href = `/partidos/${matchId}`;
    if (outcome === "CONFIRMED") {
      await notifyUsers(await teamPlayerIds([match.homeTeamId, match.awayTeamId]), {
        type: "RATING_CHANGED",
        key: `result:${matchId}`,
        title: `Resultado confirmado: ${title}`,
        body: "Los dos capitanes coincidieron. Ya se movió el rango de los equipos.",
        href,
      });
    } else if (outcome === "DISPUTED") {
      const admins = await db.user.findMany({
        where: { role: "ADMIN", deletedAt: null, suspendedAt: null },
        select: { id: true },
      });
      await notifyUsers(
        admins.map((a) => a.id),
        {
          type: "RESULT_DISPUTED",
          key: `dispute:${matchId}`,
          title: "Resultado en disputa entre equipos",
          body: `${match.homeTeam?.name} vs ${match.awayTeam?.name}: los capitanes reportaron marcadores distintos.`,
          href: "/admin/partidos",
        },
      );
    } else {
      const other = side === "A" ? match.awayTeamId : match.homeTeamId;
      if (other) {
        await notifyUsers(await teamCaptainIds(other), {
          type: "CONFIRM_RESULT",
          key: `confirm:${matchId}`,
          title: "Confirma el resultado",
          body: `El otro capitán reportó ${title}. Entra y confirma o corrige.`,
          href,
        });
      }
    }
    refresh();
    return { outcome };
  });
}
