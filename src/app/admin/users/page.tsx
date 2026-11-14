import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Key } from "@/lib/i18n/dictionaries";
import { intlTag, type Locale } from "@/lib/i18n/locales";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const MESSAGES = [
  "ok",
  "ok_reset",
  "ok_role",
  "ok_delete",
  "ok_approve",
  "ok_reject",
  "error_username",
  "error_password",
  "error_taken",
  "error_forbidden",
  "error_missing",
  "error_self",
  "error_last_admin",
  "error_not_pending",
  "error_action",
] as const;

function formatDate(value: Date, locale: Locale, timeZone: string): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(value);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login?next=/admin/users");
  if (session.role !== "admin") redirect("/");

  const { t, locale } = await getI18n();
  const tz = session.settings.timezone;
  const db = getDb();
  const rows = await db.select().from(users).orderBy(asc(users.createdAt));
  const pending = rows.filter((r) => r.status === "pending");
  const accounts = rows.filter((r) => r.status !== "pending");

  const params = await searchParams;
  const messageKey = MESSAGES.find((key) => params[key] === "1");
  const message = messageKey ? t(`admin.msg.${messageKey}` as Key) : null;
  const isError = messageKey?.startsWith("error_");

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="muted text-xs uppercase tracking-wide">{t("admin.label")}</p>
          <h1 className="text-2xl font-semibold">{t("admin.title")}</h1>
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

      <section id="pending" className="flex scroll-mt-4 flex-col gap-3">
        <p className="muted text-xs uppercase tracking-wide">{t("admin.pending", { n: pending.length })}</p>
        {pending.length === 0 ? (
          <p className="muted text-sm">{t("admin.pendingNone")}</p>
        ) : (
          pending.map((row) => (
            <div key={row.id} className="card flex flex-col gap-3 border-accent/40 text-sm">
              <div>
                <p className="font-semibold">{row.username}</p>
                <p className="muted text-xs">{t("admin.requested", { when: formatDate(row.createdAt, locale, tz) })}</p>
                <p className="mt-2">{row.signupNote ? row.signupNote : <span className="muted">{t("admin.noNote")}</span>}</p>
              </div>
              <div className="flex gap-2">
                <form action={`/api/admin/users/${row.id}`} method="post" className="flex-1">
                  <input type="hidden" name="action" value="approve" />
                  <button className="btn btn-primary w-full" type="submit">
                    {t("admin.approve")}
                  </button>
                </form>
                <form action={`/api/admin/users/${row.id}`} method="post" className="flex-1">
                  <input type="hidden" name="action" value="reject" />
                  <button className="btn w-full border-danger/40 text-danger" type="submit">
                    {t("admin.reject")}
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </section>

      <form action="/api/admin/users" method="post" className="card flex flex-col gap-3">
        <p className="muted text-xs uppercase tracking-wide">{t("admin.new")}</p>
        <input className="input" type="text" name="username" placeholder={t("admin.usernamePlaceholder")} autoCapitalize="none" required />
        <input
          className="input"
          type="password"
          name="password"
          placeholder={t("admin.passwordPlaceholder")}
          minLength={8}
          required
        />
        <select className="input" name="role" defaultValue="member">
          <option value="member">{t("admin.roleMember")}</option>
          <option value="admin">{t("admin.roleAdmin")}</option>
        </select>
        <button className="btn btn-primary w-full" type="submit">
          {t("admin.create")}
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <p className="muted text-xs uppercase tracking-wide">{t("admin.accounts", { n: accounts.length })}</p>
        {accounts.map((row) => (
          <div key={row.id} className="card flex flex-col gap-3 text-sm">
            <div>
              <p className="font-semibold">
                {row.username}
                {row.id === session.id ? <span className="muted"> {t("admin.you")}</span> : null}
              </p>
              <p className="muted text-xs">
                {t("admin.meta", {
                  role: t(row.role === "admin" ? "role.admin" : "role.member"),
                  created: formatDate(row.createdAt, locale, tz),
                  last: row.lastLoginAt ? formatDate(row.lastLoginAt, locale, tz) : t("admin.never"),
                })}
              </p>
            </div>

            <form action={`/api/admin/users/${row.id}`} method="post" className="flex gap-2">
              <input type="hidden" name="action" value="reset_password" />
              <input
                className="input"
                type="password"
                name="password"
                placeholder={t("admin.newPasswordPlaceholder")}
                minLength={8}
                required
              />
              <button className="btn px-4 text-xs" type="submit">
                {t("admin.setPassword")}
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              <form action={`/api/admin/users/${row.id}`} method="post">
                <input type="hidden" name="action" value="set_role" />
                <input type="hidden" name="role" value={row.role === "admin" ? "member" : "admin"} />
                <button className="btn px-3 py-2 text-xs" type="submit">
                  {row.role === "admin" ? t("admin.makeMember") : t("admin.makeAdmin")}
                </button>
              </form>
              {row.id === session.id ? null : (
                <form action={`/api/admin/users/${row.id}`} method="post">
                  <input type="hidden" name="action" value="delete" />
                  <button className="btn border-danger/40 px-3 py-2 text-xs text-danger" type="submit">
                    {t("common.remove")}
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
