import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/components/layout/nav-links";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { APP_DESCRIPTION, APP_NAME } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} · Pichangas en San Clemente`, template: `%s | ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0b2618" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" suppressHydrationWarning className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <a
            href="#contenido"
            className="sr-only z-50 rounded-md bg-card px-3 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Saltar al contenido
          </a>
          <SiteHeader />
          <main id="contenido" className="flex-1 pb-28 lg:pb-16">
            {children}
          </main>
          <SiteFooter />
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
