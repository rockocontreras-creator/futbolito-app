import { Bell } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { ensureWeatherAlerts } from "@/server/services/weather-alerts";
import { getCurrentUser } from "@/server/session";

/** Campana con el número de notificaciones sin leer. Antes revisa el clima de los próximos partidos. */
export async function NotificationBell() {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureWeatherAlerts(user.id).catch((e) => console.error("alertas de clima", e));
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  return (
    <Link
      href="/notificaciones"
      className="relative grid size-10 place-items-center rounded-full text-foreground/80 hover:bg-secondary hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none"
      aria-label={unread ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
    >
      <Bell className="size-5" aria-hidden />
      {unread > 0 && (
        <span className="absolute top-1 right-1 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[11px] leading-5 font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
