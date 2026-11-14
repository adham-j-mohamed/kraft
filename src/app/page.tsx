import Link from "next/link";
import { redirect } from "next/navigation";
import { countPending } from "@/lib/auth/pending";
import { getCurrentUser } from "@/lib/auth/user";
import { todayInZone } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { getDay } from "@/lib/food/queries";
import { getActiveProgram, getActiveSession, nextWorkoutOf } from "@/lib/training/queries";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { t, tn, fmt, exName } = await getI18n();
  const today = todayInZone(user.settings.timezone);

  // Statuskortet är driftinfo och visas bara för admin (rollen avgör, inte användarnamnet).
  const isAdmin = user.role === "admin";
  const [program, active, pending, dbTime, food] = await Promise.all([
    getActiveProgram(user.id),
    getActiveSession(user.id),
    isAdmin ? countPending() : Promise.resolve(0),
    isAdmin
      ? getDb()
          .execute<{ now: string }>(sql`select now()::text as now`)
          .then((r) => r.rows[0]?.now.slice(0, 16) ?? "")
      : Promise.resolve(null),
    getDay(user.id, today, user.settings),
  ]);
  const next = program ? nextWorkoutOf(program) : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      <header className="flex flex-col gap-3">
        <div>
          <p className="muted text-xs">{today}</p>
          <h1 className="text-2xl font-semibold">{t("dash.hello", { name: user.name ?? user.username })}</h1>
        </div>
        <nav className="flex flex-wrap gap-2">
          <Link className="btn px-4 py-2 text-sm" href="/train">
            {t("nav.training")}
          </Link>
          <Link className="btn px-4 py-2 text-sm" href="/food">
            {t("nav.food")}
          </Link>
          <Link className="btn px-4 py-2 text-sm" href="/settings">
            {t("nav.settings")}
          </Link>
          {user.role === "admin" ? (
            <Link className="btn px-4 py-2 text-sm" href="/admin/users">
              {t("nav.users")}
            </Link>
          ) : null}
        </nav>
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

      <section className="card flex flex-col gap-3">
        <p className="muted text-xs uppercase tracking-wide">{t("dash.food")}</p>
        {food.totals.kcal > 0 || food.targets ? (
          <>
            <p className="text-2xl font-semibold tabular-nums">
              {fmt.num(food.totals.kcal, 0)}{" "}
              <span className="muted text-base font-normal">{food.targets ? t("food.goalOf", { n: food.targets.kcal }) : "kcal"}</span>
            </p>
            {food.targets ? (
              <>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full ${food.totals.kcal > food.targets.kcal ? "bg-danger" : "bg-accent"}`}
                    style={{ width: `${Math.min(100, (food.totals.kcal / food.targets.kcal) * 100)}%` }}
                  />
                </div>
                <p className="muted text-sm">
                  {food.targets.kcal - food.totals.kcal >= 0
                    ? t("food.left", { n: Math.round(food.targets.kcal - food.totals.kcal) })
                    : t("food.over", { n: Math.round(food.totals.kcal - food.targets.kcal) })}
                </p>
              </>
            ) : null}
          </>
        ) : (
          <p className="muted text-sm">{t("dash.foodNone")}</p>
        )}
        <Link className="btn w-full" href="/food">
          {t("dash.openFood")}
        </Link>
      </section>

      {dbTime !== null ? (
        <section className="card text-sm">
          <p className="muted text-xs uppercase tracking-wide">{t("dash.status")}</p>
          <ul className="mt-2 space-y-1">
            <li>{t("dash.db", { time: dbTime })}</li>
            <li>{t("dash.login", { name: user.username, role: t("role.admin") })}</li>
          </ul>
        </section>
      ) : null}
    </main>
  );
}
