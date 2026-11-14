import "server-only";
import { after } from "next/server";
import type { NotificationType } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sendPush } from "@/server/push";

export interface NotifyInput {
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  /** Si se repite la misma clave para el mismo usuario, se actualiza en vez de duplicar. */
  key: string;
  /** true: al repetirse vuelve a "no leída" (ej. resultado corregido). false: no se toca si ya existe. */
  renotify?: boolean;
}

/**
 * Crea o refresca una notificación de la campana para cada usuario y, si activó los avisos,
 * se la manda también al celular. Con `renotify: false` el aviso sale una sola vez.
 */
export async function notifyUsers(userIds: readonly string[], n: NotifyInput) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return;
  let pushTo = ids;
  if (n.renotify === false) {
    const already = await db.notification.findMany({
      where: { userId: { in: ids }, key: n.key },
      select: { userId: true },
    });
    const seen = new Set(already.map((a) => a.userId));
    pushTo = ids.filter((id) => !seen.has(id));
  }
  await Promise.all(
    ids.map((userId) =>
      db.notification.upsert({
        where: { userId_key: { userId, key: n.key } },
        create: {
          userId,
          type: n.type,
          title: n.title,
          body: n.body ?? null,
          href: n.href ?? null,
          key: n.key,
        },
        update:
          n.renotify === false
            ? {}
            : { title: n.title, body: n.body ?? null, href: n.href ?? null, readAt: null },
      }),
    ),
  );
  const push = () => sendPush(pushTo, { title: n.title, body: n.body, url: n.href, tag: n.key });
  try {
    // Después de responder, para no hacer esperar a quien provocó el aviso.
    after(push);
  } catch {
    // Fuera de un pedido web (scripts, pruebas): se manda de inmediato.
    await push();
  }
}
