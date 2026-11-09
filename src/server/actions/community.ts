"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { commentIdSchema, profileCommentSchema } from "@/lib/validations/community";
import { runAction } from "@/server/action-result";
import { AuthError, requireUser } from "@/server/permissions";

const COOLDOWN_MS = 30_000;

/** Comentar el perfil de un jugador. Hay que tener perfil y esperar 30 s entre comentarios. */
export async function addProfileComment(input: unknown) {
  return runAction(profileCommentSchema, input, async ({ targetUserId, body }) => {
    const user = await requireUser();
    const author = await db.playerProfile.findUnique({ where: { userId: user.id } });
    if (!author) throw new AuthError("Crea tu perfil para poder comentar.");
    const target = await db.playerProfile.findUnique({ where: { userId: targetUserId } });
    if (!target) throw new AuthError("Ese jugador no existe.");

    const last = await db.profileComment.findFirst({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (last && Date.now() - last.createdAt.getTime() < COOLDOWN_MS) {
      throw new AuthError("Espera unos segundos antes de comentar de nuevo.");
    }
    const comment = await db.profileComment.create({ data: { targetUserId, authorId: user.id, body } });
    refresh();
    return { id: comment.id };
  });
}

/** Borrar un comentario: quien lo escribió, el dueño del perfil o un admin. */
export async function deleteProfileComment(input: unknown) {
  return runAction(commentIdSchema, input, async ({ commentId }) => {
    const user = await requireUser();
    const comment = await db.profileComment.findFirst({ where: { id: commentId, deletedAt: null } });
    if (!comment) throw new AuthError("Ese comentario ya no existe.");
    const allowed = comment.authorId === user.id || comment.targetUserId === user.id || user.role === "ADMIN";
    if (!allowed) throw new AuthError("No puedes borrar este comentario.");
    await db.profileComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
    refresh();
    return { deleted: true };
  });
}
