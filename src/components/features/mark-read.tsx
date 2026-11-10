"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { markAllNotificationsRead } from "@/server/actions/notifications";

/** Al abrir la página de notificaciones, las marca como leídas (y actualiza la campana). */
export function MarkAllRead({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!hasUnread) return;
    markAllNotificationsRead().then(() => router.refresh());
  }, [hasUnread, router]);
  return null;
}
