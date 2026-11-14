import type { Metadata, Viewport } from "next";
import { getCurrentUser } from "@/lib/auth/user";
import { countPending } from "@/lib/auth/pending";
import { I18nProvider } from "@/lib/i18n/client";
import { getExplicitLocale, getI18n } from "@/lib/i18n/server";
import { THEME_COLOR } from "@/lib/theme";
import { getTheme } from "@/lib/theme-server";
import { TopBar } from "./TopBar";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const [{ t }, theme] = await Promise.all([getI18n(), getTheme()]);
  return {
    title: "Kraft",
    description: t("meta.description"),
    applicationName: "Kraft",
    appleWebApp: {
      capable: true,
      title: "Kraft",
      // Mörkt: innehållet går under statusfältet med vit text. Ljust: vit text mot ljus
      // bakgrund vore oläslig, så då används iOS standardstil (mörk text). Gäller nästa
      // gång appen öppnas från hemskärmen.
      statusBarStyle: theme === "light" ? "default" : "black-translucent",
    },
    formatDetection: { telephone: false },
  };
}

export async function generateViewport(): Promise<Viewport> {
  return {
    themeColor: THEME_COLOR[await getTheme()],
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ locale }, explicit, user, theme] = await Promise.all([
    getI18n(),
    getExplicitLocale(),
    getCurrentUser().catch(() => null),
    getTheme(),
  ]);
  const isAdmin = user?.role === "admin";
  const pending = isAdmin ? await countPending().catch(() => 0) : 0;

  return (
    <html lang={locale} data-theme={theme}>
      <body>
        <I18nProvider locale={locale}>
          <TopBar explicit={explicit} isAdmin={isAdmin} pending={pending} theme={theme} />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
