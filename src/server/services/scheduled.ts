import "server-only";
import { db } from "@/lib/db";
import { formatMatchDate } from "@/lib/format";
import { GOING_WINDOW_HOURS, REMINDER_HOURS, timeLeftLabel } from "@/lib/match-timing";
import { nextWeeklyStart } from "@/lib/series";
import { claimEvery } from "@/server/settings";
import { notifyUsers } from "./notify";
import { teamPlayerIds } from "./team-match";

// Tareas con reloj: recordatorios, "¿Vas o no vas?" y la próxima fecha de las pichangas fijas.
// Las dispara el reloj de Supabase cada 10 minutos (/api/cron) y, por si acaso, las visitas a la página.
// Todo es idempotente: cada aviso lleva una clave única, así que correr dos veces no duplica nada.

const HOUR = 3_600_000;
const UPCOMING = ["OPEN", "FULL", "CONFIRMED"] as const;

export interface ScheduledRun {
  seriesCreated: number;
  goingAsked: number;
  reminders: number;
}

export async function runScheduledJobs(now: Date = new Date()): Promise<ScheduledRun> {
  const seriesCreated = await publishSeriesMatches(now);
  const goingAsked = await askWhoIsGoing(now);
  const reminders = await sendReminders(now);
  return { seriesCreated, goingAsked, reminders };
}

/** Lo mismo, pero como mucho una vez cada 5 minutos: para llamarlo desde las visitas. */
export async function runScheduledJobsIfDue() {
  try {
    if (await claimEvery("lastTick", 5)) await runScheduledJobs();
  } catch (e) {
    console.error("[reloj]", e);
  }
}

/** Pichanga fija: cuando la fecha de esta semana ya empezó, publica la de la próxima y avisa a los de siempre. */
async function publishSeriesMatches(now: Date): Promise<number> {
  const series = await db.matchSeries.findMany({
    where: { isActive: true, organizer: { deletedAt: null, suspendedAt: null } },
    include: { matches: { orderBy: { startsAt: "desc" }, take: 3, select: { id: true, startsAt: true } } },
  });
  let created = 0;
  for (const s of series) {
    const latest = s.matches[0];
    if (latest && latest.startsAt > now) continue; // ya hay una fecha por jugar
    const startsAt = nextWeeklyStart(s, latest && latest.startsAt > now ? latest.startsAt : now);
    const match = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "MatchSeries" WHERE id = ${s.id} FOR UPDATE`;
      const dup = await tx.match.findFirst({ where: { seriesId: s.id, startsAt: { gt: now } } });
      if (dup) return null;
      return tx.match.create({
        data: {
          type: "PICKUP",
          seriesId: s.id,
          comunaId: s.comunaId,
          venueId: s.venueId,
          organizerId: s.organizerId,
          startsAt,
          durationMinutes: s.durationMinutes,
          playersPerSide: s.playersPerSide,
          maxPlayers: s.maxPlayers,
          minRating: s.minRating,
          maxRating: s.maxRating,
          pricePerPerson: s.pricePerPerson,
          notes: s.notes,
          colorA: s.colorA,
          colorB: s.colorB,
          participants: { create: { userId: s.organizerId, status: "REGISTERED" } },
        },
        include: { venue: { select: { name: true } } },
      });
    });
    if (!match) continue;
    created++;
    // "Los de siempre": quienes estuvieron en las últimas fechas.
    const regulars = await db.matchParticipant.findMany({
      where: {
        matchId: { in: s.matches.map((m) => m.id) },
        status: { in: ["REGISTERED", "ATTENDED"] },
        userId: { not: s.organizerId },
        user: { deletedAt: null, suspendedAt: null },
      },
      select: { userId: true },
    });
    await notifyUsers(
      regulars.map((r) => r.userId),
      {
        type: "SYSTEM",
        key: `series:${match.id}`,
        renotify: false,
        title: "Ya está la pichanga de la próxima semana",
        body: `${formatMatchDate(match.startsAt)}${match.venue ? ` en ${match.venue.name}` : ""}. ¿Te sumas?`,
        href: `/partidos/${match.id}`,
      },
    );
  }
  return created;
}

/** El día del partido: pregunta a los inscritos que no han respondido. */
async function askWhoIsGoing(now: Date): Promise<number> {
  const matches = await db.match.findMany({
    where: {
      deletedAt: null,
      type: "PICKUP",
      status: { in: [...UPCOMING] },
      startsAt: { gt: now, lte: new Date(now.getTime() + GOING_WINDOW_HOURS * HOUR) },
    },
    select: {
      id: true,
      startsAt: true,
      venue: { select: { name: true } },
      participants: { where: { status: "REGISTERED", goingAt: null }, select: { userId: true } },
    },
  });
  let asked = 0;
  for (const m of matches) {
    if (m.participants.length === 0) continue;
    asked += m.participants.length;
    await notifyUsers(
      m.participants.map((p) => p.userId),
      {
        type: "MATCH_REMINDER",
        key: `going:${m.id}`,
        renotify: false,
        title: "¿Vas o no vas?",
        body: `${formatMatchDate(m.startsAt)}${m.venue ? ` en ${m.venue.name}` : ""}. Confirma para que nadie quede esperando.`,
        href: `/partidos/${m.id}`,
      },
    );
  }
  return asked;
}

/** Recordatorio 2 horas antes, para revoltijos y partidos entre equipos. */
async function sendReminders(now: Date): Promise<number> {
  const matches = await db.match.findMany({
    where: {
      deletedAt: null,
      status: { in: [...UPCOMING] },
      startsAt: { gt: now, lte: new Date(now.getTime() + REMINDER_HOURS * HOUR) },
    },
    select: {
      id: true,
      type: true,
      startsAt: true,
      homeTeamId: true,
      awayTeamId: true,
      venue: { select: { name: true } },
      participants: { where: { status: "REGISTERED" }, select: { userId: true } },
    },
  });
  let sent = 0;
  for (const m of matches) {
    const userIds =
      m.type === "PICKUP"
        ? m.participants.map((p) => p.userId)
        : await teamPlayerIds([m.homeTeamId, m.awayTeamId]);
    if (userIds.length === 0) continue;
    sent += userIds.length;
    await notifyUsers(userIds, {
      type: "MATCH_REMINDER",
      key: `reminder:${m.id}`,
      renotify: false,
      title: `Tu partido es ${timeLeftLabel(m.startsAt, now)}`,
      body: `${formatMatchDate(m.startsAt)}${m.venue ? ` en ${m.venue.name}` : ""}.`,
      href: `/partidos/${m.id}`,
    });
  }
  return sent;
}
