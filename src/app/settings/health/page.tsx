import Link from "next/link";
import { redirect } from "next/navigation";
import { tokenStatus } from "@/lib/auth/api-token";
import { getCurrentUser } from "@/lib/auth/user";
import { getI18n } from "@/lib/i18n/server";
import { HealthSync } from "./HealthSync";

export const dynamic = "force-dynamic";

function parseSummary(raw: string | null): { weightKg?: number; waterMl?: number } {
  try {
    const v = JSON.parse(raw ?? "{}");
    return {
      weightKg: typeof v.weightKg === "number" ? v.weightKg : undefined,
      waterMl: typeof v.waterMl === "number" ? v.waterMl : undefined,
    };
  } catch {
    return {};
  }
}

export default async function HealthSyncPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/health");

  const { t, locale, fmt } = await getI18n();
  const status = await tokenStatus(user.id);
  const when = (d: Date) =>
    new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", {
      timeZone: user.settings.timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);

  let statusLine: string;
  if (!status) {
    statusLine = t("health.status.none");
  } else if (!status.lastUsedAt) {
    statusLine = `${t("health.status.created", { when: when(status.createdAt) })} ${t("health.status.never")}`;
  } else {
    const s = parseSummary(status.lastSummary);
    const parts = [
      s.weightKg !== undefined ? t("health.what.weight", { kg: fmt.num(s.weightKg) }) : null,
      s.waterMl !== undefined ? t("health.what.water", { ml: fmt.num(s.waterMl) }) : null,
    ].filter(Boolean);
    statusLine = t("health.status.last", {
      when: when(status.lastUsedAt),
      what: parts.length ? parts.join(" · ") : t("health.what.nothing"),
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-12 pt-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("health.title")}</h1>
        <Link className="btn px-4 py-2 text-sm" href="/settings">
          {t("settings.title")}
        </Link>
      </header>
      <p className="muted text-sm">{t("health.lead")}</p>
      <p className="card text-sm" role="status">
        {statusLine}
      </p>
      <HealthSync hasToken={status !== null} />
    </main>
  );
}
