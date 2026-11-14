import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Key } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const ERRORS = ["invalid", "blocked", "missing", "pending"] as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; username?: string; next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const db = getDb();
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  if (count === 0) redirect("/register");

  const { t } = await getI18n();
  const params = await searchParams;
  const error = params.error
    ? t(
        ((ERRORS as readonly string[]).includes(params.error)
          ? `login.err.${params.error}`
          : "login.err.other") as Key,
      )
    : null;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col justify-center gap-6 px-5 py-8">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">Kraft</span>
        <h1 className="text-3xl font-semibold">{t("app.tagline")}</h1>
        <p className="muted text-sm">{t("login.lead")}</p>
      </div>

      {error ? (
        <div className={`card text-sm ${params.error === "pending" ? "border-accent/50" : "border-danger/40"}`}>
          <p>{error}</p>
        </div>
      ) : null}

      <form action="/api/auth/login" method="post" className="card flex flex-col gap-4">
        <input type="hidden" name="next" value={params.next ?? "/"} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="muted text-xs uppercase tracking-wide">{t("login.username")}</span>
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
          <span className="muted text-xs uppercase tracking-wide">{t("login.password")}</span>
          <input className="input" type="password" name="password" autoComplete="current-password" required />
        </label>
        <button className="btn btn-primary w-full" type="submit">
          {t("login.submit")}
        </button>
      </form>

      <div className="flex flex-col items-center gap-2 text-center text-xs">
        <p className="muted">
          {t("login.noAccount")}{" "}
          <Link href="/register" className="text-accent font-semibold underline underline-offset-2">
            {t("login.createAccount")}
          </Link>
        </p>
        <p className="muted">{t("login.installHint")}</p>
        <p>
          <Link href="/help" className="text-accent font-semibold underline underline-offset-2">
            {t("top.help")}
          </Link>
        </p>
      </div>
    </main>
  );
}
