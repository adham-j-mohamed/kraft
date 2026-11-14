import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import type { Key } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const MESSAGES = ["ok", "error_password", "error_confirm", "error_current"] as const;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");

  const { t } = await getI18n();
  const params = await searchParams;
  const messageKey = MESSAGES.find((key) => params[key] === "1");
  const message = messageKey ? t(`settings.msg.${messageKey}` as Key) : null;
  const isError = messageKey?.startsWith("error_");

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="muted text-xs uppercase tracking-wide">{t("settings.title")}</p>
          <h1 className="text-2xl font-semibold">{user.name ?? user.username}</h1>
        </div>
        <Link className="btn px-4 py-2 text-sm" href="/">
          {t("common.back")}
        </Link>
      </header>

      {message ? (
        <div className={`card text-sm ${isError ? "border-danger/40" : "border-accent/40"}`}>
          <p>{message}</p>
        </div>
      ) : null}

      <section className="card flex flex-col gap-2 text-sm">
        <p className="muted text-xs uppercase tracking-wide">{t("settings.account")}</p>
        <p>
          {t("settings.username")} <strong>{user.username}</strong>
        </p>
        <p>
          {t("settings.role")} {t(user.role === "admin" ? "role.admin" : "role.member")}
        </p>
        <p className="muted text-xs">
          {t("settings.timezone")} {user.settings.timezone}
        </p>
      </section>

      <form action="/api/auth/password" method="post" className="card flex flex-col gap-4">
        <p className="muted text-xs uppercase tracking-wide">{t("settings.changePassword")}</p>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="muted text-xs">{t("settings.current")}</span>
          <input className="input" type="password" name="current" autoComplete="current-password" required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="muted text-xs">{t("settings.new")}</span>
          <input className="input" type="password" name="next" autoComplete="new-password" minLength={8} required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="muted text-xs">{t("settings.repeat")}</span>
          <input className="input" type="password" name="confirm" autoComplete="new-password" minLength={8} required />
        </label>
        <button className="btn w-full" type="submit">
          {t("settings.changePassword")}
        </button>
      </form>

      <form action="/api/auth/logout" method="post">
        <button className="btn w-full" type="submit">
          {t("settings.logout")}
        </button>
      </form>
    </main>
  );
}
