import type { Metadata, Viewport } from "next";
import { getCurrentUser } from "@/lib/auth/user";
import { countPending } from "@/lib/auth/pending";
import { I18nProvider } from "@/lib/i18n/client";
import { getExplicitLocale, getI18n } from "@/lib/i18n/server";
import { TopBar } from "./TopBar";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: "Kraft",
    description: t("meta.description"),
    applicationName: "Kraft",
    appleWebApp: {
      capable: true,
      title: "Kraft",
      statusBarStyle: "black-translucent",
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0d0c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ locale }, explicit, user] = await Promise.all([
    getI18n(),
    getExplicitLocale(),
    getCurrentUser().catch(() => null),
  ]);
  const isAdmin = user?.role === "admin";
  const pending = isAdmin ? await countPending().catch(() => 0) : 0;

  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale}>
          <TopBar explicit={explicit} isAdmin={isAdmin} pending={pending} />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
