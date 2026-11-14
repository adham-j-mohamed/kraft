import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { exerciseHistory } from "@/lib/training/queries";
import type { Key } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { bestScore } from "@/lib/training/types";
import { Sparkline } from "@/app/Sparkline";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/train/exercise/${id}`);
  if (!UUID.test(id)) notFound();

  const { t, locale, fmt, exName } = await getI18n();
  const history = await exerciseHistory(user.id, id, { timeZone: user.settings.timezone, locale });
  if (!history) notFound();
  const { exercise, entries, pb } = history;

  // Äldst först i grafen.
  const points = [...entries].reverse().map((e) => bestScore(e.best, e.tracking));
  const unit = t(`ex.trendUnit.${exercise.tracking}` as Key);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="muted text-xs uppercase tracking-wide">
            {t(`muscle.${exercise.muscleGroup}` as Key) === `muscle.${exercise.muscleGroup}` ? exercise.muscleGroup : t(`muscle.${exercise.muscleGroup}` as Key)} · {t(`tracking.${exercise.tracking}` as Key)}
          </p>
          <h1 className="truncate text-2xl font-semibold">{exName(exercise.name)}</h1>
        </div>
        <Link className="btn px-4 py-2 text-sm" href="/train">
          {t("common.back")}
        </Link>
      </header>

      {entries.length === 0 ? (
        <section className="card text-sm">
          <p>{t("ex.noHistory")}</p>
        </section>
      ) : (
        <>
          {pb ? (
            <section className="card flex flex-col gap-1">
              <p className="muted text-xs uppercase tracking-wide">{t("ex.bestSet")}</p>
              <p className="text-2xl font-semibold tabular-nums">{fmt.set(pb.best, exercise.tracking)}</p>
              <p className="muted text-xs">
                {pb.dateLabel}
                {pb.best.e1rm ? ` · ${t("ex.e1rm", { n: fmt.num(pb.best.e1rm, 1) })}` : ""}
              </p>
            </section>
          ) : null}

          {points.length >= 2 ? (
            <section className="card flex flex-col gap-2">
              <p className="muted text-xs uppercase tracking-wide">{t("ex.trend", { unit })}</p>
              <Sparkline points={points} label={t("ex.chartLabel")} />
              <p className="muted text-xs tabular-nums">
                {t("ex.trendSummary", { from: fmt.num(points[0], 1), to: fmt.num(points[points.length - 1], 1), n: points.length })}
              </p>
            </section>
          ) : null}

          <section className="card flex flex-col gap-3">
            <p className="muted text-xs uppercase tracking-wide">{t("ex.byWorkout")}</p>
            <ul className="flex flex-col divide-y divide-line">
              {entries.map((e) => (
                <li key={e.sessionId} className="flex flex-col gap-1 py-3">
                  <Link className="flex items-baseline justify-between gap-3" href={`/train/session/${e.sessionId}`}>
                    <span className="font-medium">{e.dateLabel}</span>
                    <span className="muted text-xs">{e.workoutName}</span>
                  </Link>
                  <p className="text-sm tabular-nums">
                    {e.sets.map((s) => fmt.set(s, e.tracking)).join("  ·  ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
