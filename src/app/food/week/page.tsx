import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { addDays, startOfWeek, todayInZone } from "@/lib/dates";
import { effectiveTargets } from "@/lib/food/goals";
import { weekStats } from "@/lib/food/queries";
import { intlTag } from "@/lib/i18n/locales";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Måndag–söndag: kalorier mot mål, protein, träningspass och vikt per dag. */
export default async function WeekPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/food/week");

  const { t, tn, locale, fmt } = await getI18n();
  const tz = user.settings.timezone;
  const today = todayInZone(tz);
  const { d } = await searchParams;
  const anchor = d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) ? d : today;
  const start = startOfWeek(anchor);
  const days = await weekStats(user.id, start, tz);
  const target = effectiveTargets(user.settings);

  const logged = days.filter((x) => x.kcal > 0);
  const avg = logged.length ? Math.round(logged.reduce((a, x) => a + x.kcal, 0) / logged.length) : null;
  const workouts = days.reduce((a, x) => a + x.workouts, 0);
  const weights = days.filter((x) => x.weightKg != null).map((x) => x.weightKg as number);
  const weightDelta = weights.length >= 2 ? weights[weights.length - 1] - weights[0] : null;
  const max = Math.max(target?.kcal ?? 0, ...days.map((x) => x.kcal), 1);

  const tag = intlTag(locale);
  const fmtDay = (iso: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(tag, { ...o, timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
  const range = `${fmtDay(start, { day: "numeric", month: "short" })} – ${fmtDay(addDays(start, 6), { day: "numeric", month: "short" })}`;
  const isCurrent = start === startOfWeek(today);
  const sign = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt.num(Math.abs(n), 1)}`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-12 pt-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t("week.title")}</h1>
          <Link className="btn px-4 py-2 text-sm" href={`/food?d=${isCurrent ? today : start}`}>
            {t("food.title")}
          </Link>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Link className="btn h-11 w-11 px-0" href={`/food/week?d=${addDays(start, -7)}`} aria-label={t("week.prev")}>
            ‹
          </Link>
          <div className="text-center">
            <p className="font-medium">{range}</p>
            {isCurrent ? <p className="muted text-xs">{t("week.thisWeek")}</p> : null}
          </div>
          <Link className="btn h-11 w-11 px-0" href={`/food/week?d=${addDays(start, 7)}`} aria-label={t("week.next")}>
            ›
          </Link>
        </div>
      </header>

      <section className="card grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="muted text-xs uppercase tracking-wide">{t("week.avgShort")}</p>
          <p className="text-lg font-semibold tabular-nums">{avg != null ? fmt.num(avg, 0) : "—"}</p>
        </div>
        <div>
          <p className="muted text-xs uppercase tracking-wide">{t("week.totalWorkouts")}</p>
          <p className="text-lg font-semibold tabular-nums">{workouts}</p>
        </div>
        <div>
          <p className="muted text-xs uppercase tracking-wide">{t("weight.title")}</p>
          <p className="text-lg font-semibold tabular-nums">{weightDelta != null ? sign(weightDelta) : "—"}</p>
        </div>
      </section>

      <section className="card flex flex-col gap-1">
        {target ? <p className="muted pb-1 text-xs">{t("week.target", { n: target.kcal })}</p> : null}
        {logged.length === 0 && workouts === 0 ? <p className="muted pb-2 text-sm">{t("week.noData")}</p> : null}
        <ul className="flex flex-col">
          {days.map((x) => {
            const over = target != null && x.kcal > target.kcal;
            return (
              <li key={x.date} className="border-b border-line last:border-0">
                <Link href={`/food?d=${x.date}`} className="flex flex-col gap-1.5 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={`font-medium capitalize ${x.date === today ? "text-accent" : ""}`}>
                      {fmtDay(x.date, { weekday: "short", day: "numeric" })}
                    </span>
                    <span className="flex items-center gap-3 text-sm tabular-nums">
                      {x.workouts > 0 ? <span className="bg-accent text-accent-ink rounded-full px-2 py-0.5 text-[11px] font-semibold">{tn("week.workouts", x.workouts)}</span> : null}
                      <span>{x.kcal > 0 ? `${fmt.num(x.kcal, 0)} kcal` : "—"}</span>
                    </span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-line">
                    <div className={`h-full ${over ? "bg-danger" : "bg-accent"}`} style={{ width: `${(x.kcal / max) * 100}%` }} />
                    {target ? <div className="absolute inset-y-0 w-0.5 bg-ink/60" style={{ left: `${(target.kcal / max) * 100}%` }} /> : null}
                  </div>
                  {x.kcal > 0 ? (
                    <p className="muted text-xs tabular-nums">
                      {t("food.macroShort", { p: fmt.num(x.protein, 0), c: fmt.num(x.carbs, 0), f: fmt.num(x.fat, 0) })}
                      {x.weightKg != null ? ` · ${fmt.num(x.weightKg, 1)} kg` : ""}
                    </p>
                  ) : x.weightKg != null ? (
                    <p className="muted text-xs tabular-nums">{fmt.num(x.weightKg, 1)} kg</p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <p className="muted text-center text-xs">{t("food.approx")}</p>
    </main>
  );
}
