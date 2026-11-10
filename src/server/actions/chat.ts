"use server";

import { db } from "@/lib/db";
import { listMessagesSchema, messageIdSchema, sendMessageSchema } from "@/lib/validations/chat";
import { runAction } from "@/server/action-result";
import { AuthError, requireUser } from "@/server/permissions";

// Chat de la sala del partido. Solo para quienes están en el partido (inscritos, espera, jugaron) y el organizador.
const COOLDOWN_MS = 1500;
const PAGE = 100;

async function requireRoomMember(matchId: string) {
  const user = await requireUser();
  const match = await db.match.findFirst({
    where: { id: matchId, deletedAt: null },
    select: { organizerId: true },
  });
  if (!match) throw new AuthError("Ese partido no existe.");
  if (match.organizerId === user.id || user.role === "ADMIN")
    return { user, isOrganizer: match.organizerId === user.id };
  const p = await db.matchParticipant.findUnique({ where: { matchId_userId: { matchId, userId: user.id } } });
  if (!p || p.status === "WITHDRAWN" || p.status === "KICKED") {
    throw new AuthError("El chat es solo para quienes están en el partido.");
  }
  return { user, isOrganizer: false };
}

const select = {
  id: true,
  body: true,
  createdAt: true,
  userId: true,
  user: {
    select: {
      name: true,
      image: true,
      profile: { select: { displayName: true, nickname: true, photoUrl: true } },
    },
  },
} as const;

function shape(m: {
  id: string;
  body: string;
  createdAt: Date;
  userId: string;
  user: {
    name: string | null;
    image: string | null;
    profile: { displayName: string; nickname: string | null; photoUrl: string | null } | null;
  };
}) {
  return {
    id: m.id,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    userId: m.userId,
    name: m.user.profile?.nickname || m.user.profile?.displayName || m.user.name || "Jugador",
    photo: m.user.profile?.photoUrl ?? m.user.image ?? null,
  };
}

export type ChatMessage = ReturnType<typeof shape>;

export async function listMessages(input: unknown) {
  return runAction(listMessagesSchema, input, async ({ matchId, after }) => {
    await requireRoomMember(matchId);
    const rows = await db.matchMessage.findMany({
      where: { matchId, deletedAt: null, ...(after ? { createdAt: { gt: new Date(after) } } : {}) },
      orderBy: { createdAt: after ? "asc" : "desc" },
      take: PAGE,
      select,
    });
    const ordered = after ? rows : rows.reverse();
    // Para saber qué borraron otros, devolvemos también los ids eliminados recientes.
    const deleted = await db.matchMessage.findMany({
      where: { matchId, deletedAt: { not: null, gte: new Date(Date.now() - 10 * 60_000) } },
      select: { id: true },
    });
    return { messages: ordered.map(shape), deletedIds: deleted.map((d) => d.id) };
  });
}

export async function sendMessage(input: unknown) {
  return runAction(sendMessageSchema, input, async ({ matchId, body }) => {
    const { user } = await requireRoomMember(matchId);
    const last = await db.matchMessage.findFirst({
      where: { userId: user.id, matchId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (last && Date.now() - last.createdAt.getTime() < COOLDOWN_MS) throw new AuthError("Más despacio 🙂");
    const m = await db.matchMessage.create({ data: { matchId, userId: user.id, body }, select });
    return shape(m);
  });
}

/** Borrar un mensaje: su autor, el organizador del partido o un admin. */
export async function deleteMessage(input: unknown) {
  return runAction(messageIdSchema, input, async ({ messageId }) => {
    const msg = await db.matchMessage.findFirst({ where: { id: messageId, deletedAt: null } });
    if (!msg) throw new AuthError("Ese mensaje ya no existe.");
    const { user, isOrganizer } = await requireRoomMember(msg.matchId);
    if (msg.userId !== user.id && !isOrganizer && user.role !== "ADMIN")
      throw new AuthError("No puedes borrar ese mensaje.");
    await db.matchMessage.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
    return { deleted: messageId };
  });
}
