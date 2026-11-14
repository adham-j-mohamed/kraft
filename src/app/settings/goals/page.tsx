import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { MIN_KCAL, autoTargets, effectiveTargets } from "@/lib/food/goals";
import type { Key } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const MESSAGES = ["ok", "error_value", "error_manual"] as const;
const ACTIVITIES = ["sedentary", "light", "moderate", "high", "athlete"] as const;
const RATES = [-0.75, -0.5, -0.25, 0, 0.25, 0.5];

export default async function GoalsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/goals");

  const { t, fmt } = await getI18n();
  const s = user.settings;
  const params = await searchParams;
  const messageKey = MESSAGES.find((k) => params[k] === "1");
  const message = messageKey ? t(`goals.msg.${messageKey}` as Key) : null;
  const rate = Math.round(Number(s.goalRateKgWeek) * 100) / 100;
  const current = effectiveTargets(s);
  const calculated = autoTargets(s);

  const label = "flex flex-col gap-1.5 text-sm";
  const cap = "muted text-xs";
  const rateLabel = (r: number) =>
    r < 0 ? t("goals.rate.neg", { n: fmt.num(-r) }) : r > 0 ? t("goals.rate.pos", { n: fmt.num(r) }) : t("goals.rate.zero");

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-12 pt-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("goals.title")}</h1>
        <Link className="btn px-4 py-2 text-sm" href="/food">
          {t("food.title")}
        </Link>
      </header>
      <p className="muted text-sm">{t("goals.lead")}</p>

      {message ? (
        <div className={`card text-sm ${messageKey?.startsWith("error_") ? "border-danger/40" : "border-accent/40"}`}>
          <p>{message}</p>
        </div>
      ) : null}

      <section className="card text-sm">
        {current ? (
          <p>{t("goals.preview", { kcal: current.kcal, p: current.protein, c: current.carbs, f: current.fat })}</p>
        ) : (
          <p className="muted">{t("goals.previewNone")}</p>
        )}
        {calculated ? <p className="muted mt-1 text-xs">{t("goals.floorNote", { n: MIN_KCAL })}</p> : null}
      </section>

      <form action="/api/me/goals" method="post" className="card flex flex-col gap-4">
        <p className="muted text-xs uppercase tracking-wide">{t("goals.about")}</p>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            <span className={cap}>{t("goals.height")}</span>
            <input className="input" name="height" inputMode="numeric" defaultValue={s.heightCm ?? ""} />
          </label>
          <label className={label}>
            <span className={cap}>{t("goals.weight")}</span>
            <input className="input" name="weight" inputMode="decimal" defaultValue={s.weightKg != null ? fmt.num(Number(s.weightKg), 1) : ""} />
          </label>
          <label className={label}>
            <span className={cap}>{t("goals.birthYear")}</span>
            <input className="input" name="birthYear" inputMode="numeric" defaultValue={s.birthYear ?? ""} />
          </label>
          <label className={label}>
            <span className={cap}>{t("goals.sex")}</span>
            <select className="input" name="sex" defaultValue={s.sex ?? ""}>
              <option value="">{t("goals.sexNone")}</option>
              {(["male", "female", "other"] as const).map((v) => (
                <option key={v} value={v}>
                  {t(`goals.sex.${v}` as Key)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={label}>
          <span className={cap}>{t("goals.activity")}</span>
          <select className="input" name="activity" defaultValue={s.activityLevel}>
            {ACTIVITIES.map((v) => (
              <option key={v} value={v}>
                {t(`goals.activity.${v}` as Key)}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          <span className={cap}>{t("goals.rate")}</span>
          <select className="input" name="rate" defaultValue={String(rate)}>
            {RATES.map((r) => (
              <option key={r} value={String(r)}>
                {rateLabel(r)}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="muted mb-1 text-xs uppercase tracking-wide">{t("goals.mode")}</legend>
          {(["auto", "manual"] as const).map((m) => (
            <label key={m} className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-3 text-sm">
              <input type="radio" name="mode" value={m} defaultChecked={s.goalMode === m} />
              {t(`goals.mode.${m}` as Key)}
            </label>
          ))}
        </fieldset>

        <p className="muted text-xs">{t("goals.manualHint")}</p>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            <span className={cap}>{t("goals.manual.kcal")}</span>
            <input className="input" name="kcal" inputMode="numeric" defaultValue={s.kcalTarget ?? ""} />
          </label>
          <label className={label}>
            <span className={cap}>{t("goals.manual.protein")}</span>
            <input className="input" name="protein" inputMode="numeric" defaultValue={s.proteinTarget ?? ""} />
          </label>
          <label className={label}>
            <span className={cap}>{t("goals.manual.carbs")}</span>
            <input className="input" name="carbs" inputMode="numeric" defaultValue={s.carbsTarget ?? ""} />
          </label>
          <label className={label}>
            <span className={cap}>{t("goals.manual.fat")}</span>
            <input className="input" name="fat" inputMode="numeric" defaultValue={s.fatTarget ?? ""} />
          </label>
        </div>

        <label className={label}>
          <span className={cap}>{t("goals.water")}</span>
          <input className="input" name="water" inputMode="numeric" defaultValue={s.waterTargetMl} />
        </label>

        <button className="btn btn-primary w-full" type="submit">
          {t("goals.save")}
        </button>
      </form>

      <p className="muted text-xs">{t("goals.disclaimer")}</p>
    </main>
  );
}
