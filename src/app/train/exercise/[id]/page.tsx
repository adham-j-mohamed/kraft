import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { exerciseHistory } from "@/lib/training/queries";
import { bestScore, fmtNum, fmtSet, TRACKING_LABEL } from "@/lib/training/types";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/train/exercise/${id}`);
  if (!UUID.test(id)) notFound();

  const history = await exerciseHistory(user.id, id, user.settings.timezone);
  if (!history) notFound();
  const { exercise, entries, pb } = history;

  // Äldst först i grafen.
  const points = [...entries].reverse().map((e) => bestScore(e.best, e.tracking));
  const unit = exercise.tracking === "weight_reps" ? "kg (uppskattat 1RM)" : exercise.tracking === "reps_only" ? "reps" : exercise.tracking === "time" ? "sekunder" : "meter";

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="muted text-xs uppercase tracking-wide">
            {exercise.muscleGroup} · {TRACKING_LABEL[exercise.tracking]}
          </p>
          <h1 className="truncate text-2xl font-semibold">{exercise.name}</h1>
        </div>
        <Link className="btn px-4 py-2 text-sm" href="/train">
          Tillbaka
        </Link>
      </header>

      {entries.length === 0 ? (
        <section className="card text-sm">
          <p>Inga avslutade pass med den här övningen än. Historiken dyker upp när du avslutat ett pass.</p>
        </section>
      ) : (
        <>
          {pb ? (
            <section className="card flex flex-col gap-1">
              <p className="muted text-xs uppercase tracking-wide">Bästa set</p>
              <p className="text-2xl font-semibold tabular-nums">{fmtSet(pb.best, exercise.tracking)}</p>
              <p className="muted text-xs">
                {pb.dateLabel}
                {pb.best.e1rm ? ` · ≈ ${fmtNum(pb.best.e1rm, 1)} kg 1RM (Epley)` : ""}
              </p>
            </section>
          ) : null}

          {points.length >= 2 ? (
            <section className="card flex flex-col gap-2">
              <p className="muted text-xs uppercase tracking-wide">Utveckling · {unit}</p>
              <Sparkline points={points} />
              <p className="muted text-xs tabular-nums">
                {fmtNum(points[0], 1)} → {fmtNum(points[points.length - 1], 1)} över {points.length} pass
              </p>
            </section>
          ) : null}

          <section className="card flex flex-col gap-3">
            <p className="muted text-xs uppercase tracking-wide">Pass för pass</p>
            <ul className="flex flex-col divide-y divide-line">
              {entries.map((e) => (
                <li key={e.sessionId} className="flex flex-col gap-1 py-3">
                  <Link className="flex items-baseline justify-between gap-3" href={`/train/session/${e.sessionId}`}>
                    <span className="font-medium">{e.dateLabel}</span>
                    <span className="muted text-xs">{e.workoutName}</span>
                  </Link>
                  <p className="text-sm tabular-nums">
                    {e.sets.map((s) => fmtSet(s, e.tracking)).join("  ·  ")}
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

/** Enkel linje utan bibliotek. Y-axeln börjar inte på noll — det är trenden som visas. */
function Sparkline({ points }: { points: number[] }) {
  const w = 320;
  const h = 80;
  const pad = 6;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (points.length - 1);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - 2 * pad);
  const path = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full" role="img" aria-label="Utveckling över tid">
      <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === points.length - 1 ? 4 : 2.5} fill="var(--color-accent)" />
      ))}
    </svg>
  );
}
