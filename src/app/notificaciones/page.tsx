import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, CheckCircle2, CloudRain, Megaphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignInRequired } from "@/components/features/auth/sign-in-required";
import { EmptyState } from "@/components/features/empty-state";
import { MarkAllRead } from "@/components/features/mark-read";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Notificaciones" };

const ICON = { WEATHER_ALERT: CloudRain, CONFIRM_RESULT: CheckCircle2 } as const;

export default function NotificationsPage() {
  return (
    <Container className="max-w-2xl pt-8">
      <PageHeader title="Notificaciones" />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border-2 bg-card" aria-hidden />}>
        <List />
      </Suspense>
    </Container>
  );
}

async function List() {
  const user = await getCurrentUser();
  if (!user)
    return (
      <SignInRequired
        next="/notificaciones"
        title="Ingresa para ver tus avisos"
        text="Clima de tus partidos, resultados por confirmar y más."
      />
    );
  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  const hasUnread = items.some((n) => !n.readAt);
  if (items.length === 0) {
    return (
      <EmptyState icon={Bell} title="Sin notificaciones">
        Acá te avisamos si va a llover en tus partidos o si tienes que confirmar un resultado.
      </EmptyState>
    );
  }
  return (
    <>
      <MarkAllRead hasUnread={hasUnread} />
      <ul className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
        {items.map((n) => {
          const Icon = ICON[n.type as keyof typeof ICON] ?? Megaphone;
          const body = (
            <>
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full",
                  n.type === "WEATHER_ALERT" ? "bg-[#dbeafe] text-[#1d4ed8]" : "bg-primary/12 text-primary",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block", !n.readAt && "font-extrabold")}>{n.title}</span>
                {n.body && <span className="block text-sm text-muted-foreground">{n.body}</span>}
                <span className="text-[13px] text-muted-foreground">
                  hace {formatDistanceToNow(n.updatedAt, { locale: es })}
                </span>
              </span>
              {!n.readAt && (
                <span className="size-2.5 shrink-0 rounded-full bg-destructive" aria-label="Sin leer" />
              )}
            </>
          );
          return (
            <li key={n.id}>
              {n.href ? (
                <Link href={n.href} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50">
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
