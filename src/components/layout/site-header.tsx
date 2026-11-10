import { Suspense } from "react";
import { Brand } from "./brand";
import { TopNav } from "./nav-links";
import { NotificationBell } from "./notification-bell";
import { UserMenu, UserMenuFallback } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Brand />
        <div className="flex items-center gap-1.5 sm:gap-3">
          <TopNav />
          <Suspense fallback={<span className="size-10" aria-hidden />}>
            <NotificationBell />
          </Suspense>
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
