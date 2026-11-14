import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { addDays, todayInZone } from "@/lib/dates";
import { getDay, weightHistory } from "@/lib/food/queries";
import { weightTrend } from "@/lib/food/trend";
import { MEALS, sumMacros, type Macros } from "@/lib/food/types";
import { foodLabel } from "@/lib/i18n/foods";
import { intlTag } from "@/lib/i18n/locales";
import { getI18n } from "@/lib/i18n/server";
import { EntryRow } from "./EntryRow";
import { WaterCard } from "./WaterCard";
import { WeightCard } from "./WeightCard";

export const dynamic = "force-dynamic";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function Bar({ value, target, over }: { value: number; target: number; over?: boolean }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-line">
      <div
        className={`h-full ${over ? "bg-danger" : "bg-accent"}`}
        style={{ width: `${Math.min(100, (value / Math.max(1, target)) * 100)}%` }}
      />
    </div>
  );
}

export default async function FoodPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/food");

  const { t, locale, fmt } = await getI18n();
  const tz = user.settings.timezone;
  const today = todayInZone(tz);
  const { d } = await searchParams;
  const date = d && DAY.test(d) && !Number.isNaN(Date.parse(d)) ? d : today;

  const [day, history] = await Promise.all([getDay(user.id, date, user.settings), weightHistory(user.id, today, 30)]);
  const trend = weightTrend(history, today);
  const label = new Intl.DateTimeFormat(intlTag(locale), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
  const g = day.targets;
  const left = g ? Math.round(g.kcal - day.totals.kcal) : null;

  const macroRows: { key: "protein" | "carbs" | "fat"; label: string }[] = [
    { key: "protein", label: t("food.protein") },
    { key: "carbs", label: t("food.carbs") },
    { key: "fat", label: t("food.fat") },
  ];

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-12 pt-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t("food.title")}</h1>
          <div className="flex gap-2">
            <Link className="btn px-4 py-2 text-sm" href={`/food/week?d=${date}`}>
              {t("food.week")}
            </Link>
            <Link className="btn px-4 py-2 text-sm" href="/settings/goals">
              {t("food.goals")}
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Link className="btn h-11 w-11 px-0" href={`/food?d=${addDays(date, -1)}`} aria-label={t("food.prevDay")}>
            ‹
          </Link>
          <div className="text-center">
            <p className="font-medium first-letter:uppercase">{label}</p>
            {date !== today ? (
              <Link href="/food" className="text-accent text-xs font-semibold underline underline-offset-2">
                {t("food.today")}
              </Link>
            ) : (
              <p className="muted text-xs">{t("food.today")}</p>
            )}
          </div>
          <Link className="btn h-11 w-11 px-0" href={`/food?d=${addDays(date, 1)}`} aria-label={t("food.nextDay")}>
            ›
          </Link>
        </div>
      </header>

      <section className="card flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="muted text-xs uppercase tracking-wide">{t("food.eaten")}</p>
          {g && left != null ? (
            <p className={`text-sm font-medium ${left < 0 ? "text-danger" : ""}`}>
              {left >= 0 ? t("food.left", { n: left }) : t("food.over", { n: -left })}
            </p>
          ) : null}
        </div>
        <p className="text-3xl font-semibold tabular-nums">
          {fmt.num(day.totals.kcal, 0)} <span className="muted text-base font-normal">{g ? t("food.goalOf", { n: g.kcal }) : "kcal"}</span>
        </p>
        {g ? <Bar value={day.totals.kcal} target={g.kcal} over={day.totals.kcal > g.kcal} /> : null}
        <div className="grid grid-cols-3 gap-3 pt-1">
          {macroRows.map((m) => (
            <div key={m.key} className="flex flex-col gap-1">
              <p className="muted text-xs">{m.label}</p>
              <p className="text-sm font-medium tabular-nums">
                {fmt.num(day.totals[m.key], 0)}
                {g ? <span className="muted font-normal"> / {fmt.num((g as Macros)[m.key], 0)} g</span> : <span className="muted font-normal"> g</span>}
              </p>
              {g ? <Bar value={day.totals[m.key]} target={(g as Macros)[m.key]} /> : null}
            </div>
          ))}
        </div>
        {g ? null : (
          <div className="flex flex-col gap-2 pt-1">
            <p className="muted text-sm">{t("food.noGoal")}</p>
            <Link className="btn w-full" href="/settings/goals">
              {t("food.setGoal")}
            </Link>
          </div>
        )}
      </section>

      {MEALS.map((meal) => {
        const entries = day.entries.filter((e) => e.meal === meal);
        const sub = sumMacros(entries);
        return (
          <section key={meal} className="card flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{t(`meal.${meal}` as const)}</h2>
              <div className="flex items-center gap-3">
                {entries.length > 0 ? <span className="muted text-sm tabular-nums">{fmt.num(sub.kcal, 0)} kcal</span> : null}
                <Link className="btn px-4 py-1.5 text-sm" href={`/food/add?meal=${meal}&d=${date}`}>
                  {t("food.add")}
                </Link>
              </div>
            </div>
            {entries.length === 0 ? (
              <p className="muted text-sm">{t("food.emptyMeal")}</p>
            ) : (
              <ul className="flex flex-col">
                {entries.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={{ id: e.id, label: foodLabel(e.name, locale), grams: e.grams, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat }}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <WaterCard key={`w-${date}`} date={date} ml={day.waterMl} target={day.waterTargetMl} />
      <WeightCard
        key={`g-${date}`}
        date={date}
        weightKg={day.weightKg}
        last={trend.last}
        avg7={trend.avg7}
        delta={trend.delta}
        points={history.map((p) => p.weightKg)}
      />

      <p className="muted text-center text-xs">{t("food.approx")}</p>
    </main>
  );
}
