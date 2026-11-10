"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/server/permissions";

/** Marca todas mis notificaciones como leídas. */
export async function markAllNotificationsRead() {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true as const, data: null };
}
