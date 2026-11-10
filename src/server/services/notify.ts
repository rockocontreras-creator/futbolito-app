import "server-only";
import type { NotificationType } from "@/generated/prisma/client";
import { db } from "@/lib/db";

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

/** Crea o refresca una notificación de la campana para cada usuario. */
export async function notifyUsers(userIds: readonly string[], n: NotifyInput) {
  await Promise.all(
    [...new Set(userIds)].map((userId) =>
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
}
