import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Key } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const ERRORS = ["username", "password", "confirm", "taken", "rate", "full"] as const;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; username?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const db = getDb();
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const first = count === 0;

  const { t } = await getI18n();
  const params = await searchParams;
  const error = params.error
    ? t(
        ((ERRORS as readonly string[]).includes(params.error)
          ? `register.err.${params.error}`
          : "register.err.other") as Key,
      )
    : null;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col justify-center gap-6 px-5 py-8">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">Kraft</span>
        <h1 className="text-3xl font-semibold">{first ? t("register.titleFirst") : t("register.title")}</h1>
        <p className="muted text-sm">{first ? t("register.leadFirst") : t("register.lead")}</p>
      </div>

      {error ? (
        <div className="card border-danger/40 text-sm">
          <p>{error}</p>
        </div>
      ) : null}

      <form action="/api/auth/register" method="post" className="card flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="muted text-xs uppercase tracking-wide">{t("register.username")}</span>
          <input
            className="input"
            type="text"
            name="username"
            defaultValue={params.username ?? ""}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="muted text-xs uppercase tracking-wide">{t("register.password")}</span>
          <input className="input" type="password" name="password" autoComplete="new-password" minLength={8} required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="muted text-xs uppercase tracking-wide">{t("register.confirm")}</span>
          <input className="input" type="password" name="confirm" autoComplete="new-password" minLength={8} required />
        </label>
        {first ? null : (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="muted text-xs uppercase tracking-wide">{t("register.note")}</span>
            <input
              className="input"
              type="text"
              name="note"
              maxLength={140}
              placeholder={t("register.notePlaceholder")}
              autoComplete="name"
              required
            />
            <span className="muted text-xs">{t("register.noteHint")}</span>
          </label>
        )}
        {/* Osynligt fält mot botar; människor lämnar det tomt. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <button className="btn btn-primary w-full" type="submit">
          {first ? t("register.submitFirst") : t("register.submit")}
        </button>
      </form>

      {first ? null : (
        <p className="muted text-center text-xs">
          {t("register.haveAccount")}{" "}
          <Link href="/login" className="text-accent font-semibold underline underline-offset-2">
            {t("register.toLogin")}
          </Link>
        </p>
      )}
    </main>
  );
}
