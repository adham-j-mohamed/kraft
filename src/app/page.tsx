import Link from "next/link";
import { redirect } from "next/navigation";
import { countPending } from "@/lib/auth/pending";
import { getCurrentUser } from "@/lib/auth/user";
import { todayInZone } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { getActiveProgram, getActiveSession, nextWorkoutOf } from "@/lib/training/queries";
import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { t, tn, fmt, exName } = await getI18n();
  const today = todayInZone(user.settings.timezone);

  const [program, active, pending] = await Promise.all([
    getActiveProgram(user.id),
    getActiveSession(user.id),
    user.role === "admin" ? countPending() : Promise.resolve(0),
  ]);
  const next = program ? nextWorkoutOf(program) : null;

  // Server time for the status card when shown
  const status = await getDb().execute(sql`select now()::text as now`);
  const showStatus = user.role === "admin" || user.username === "addejj" || user.username === "agent";

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="muted text-xs">{today}</p>
          <h1 className="text-2xl font-semibold">{t("dash.hello", { name: user.name ?? user.username })}</h1>
        </div>
        <div className="flex gap-2">
          <Link className="btn px-4 py-2 text-sm" href="/train">
            {t("nav.training")}
          </Link>
          <Link className="btn px-4 py-2 text-sm" href="/settings">
            {t("nav.settings")}
          </Link>
          {user.role === "admin" ? (
            <Link className="btn px-4 py-2 text-sm" href="/admin/users">
              {t("nav.users")}
            </Link>
          ) : null}
        </div>
      </header>

      {pending > 0 ? (
        <section className="card flex items-center justify-between gap-3 border-accent/50">
          <p className="text-sm font-medium">{tn("dash.pendingBanner", pending)}</p>
          <Link className="btn btn-primary shrink-0 px-4 py-2 text-sm" href="/admin/users#pending">
            {t("dash.review")}
          </Link>
        </section>
      ) : null}

      <section className="card flex flex-col gap-3">
        <p className="muted text-xs uppercase tracking-wide">{active ? t("dash.ongoing") : t("dash.nextWorkout")}</p>
        {active ? (
          <>
            <p className="text-xl font-semibold">{active.workoutName}</p>
            <Link className="btn btn-primary w-full" href={`/train/session/${active.id}`}>
              {t("dash.continue")}
            </Link>
          </>
        ) : next ? (
          <>
            <p className="text-xl font-semibold">{next.name}</p>
            <p className="muted text-sm">
              {next.exercises
                .slice(0, 3)
                .map((e) => `${exName(e.name)} ${fmt.target(e)}`)
                .join(" · ")}
              {next.exercises.length > 3 ? ` · +${next.exercises.length - 3}` : ""}
            </p>
            <Link className="btn btn-primary w-full" href="/train">
              {t("dash.openTraining")}
            </Link>
          </>
        ) : (
          <>
            <p className="text-xl font-semibold">{t("dash.noProgram")}</p>
            <p className="muted text-sm">{t("dash.noProgramHint")}</p>
            <Link className="btn btn-primary w-full" href="/train/program">
              {t("dash.createProgram")}
            </Link>
          </>
        )}
      </section>

      <section className="card flex flex-col gap-1">
        <p className="muted text-xs uppercase tracking-wide">{t("dash.food")}</p>
        <p className="muted text-sm">{t("dash.foodSoon")}</p>
      </section>

      {showStatus ? (
        <section className="card text-sm">
          <p className="muted text-xs uppercase tracking-wide">Status</p>
          <ul className="mt-2 space-y-1">
            <li>Databas: ansluten ({String(status.rows[0]?.now ?? "").slice(0, 16)})</li>
            <li>
              Inloggning: {user.username} ({user.role === "admin" ? "admin" : "medlem"})
            </li>
            <li>Mat: dagbok och streckkod byggs efter träningen</li>
          </ul>
        </section>
      ) : null}

    </main>
  );
}
