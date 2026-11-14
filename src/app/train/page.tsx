import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import {
  getActiveProgram,
  getActiveSession,
  nextWorkoutOf,
  recentSessions,
} from "@/lib/training/queries";
import { fmtNum, fmtTarget } from "@/lib/training/types";
import { AbandonButton, StartButton } from "./actions";

export const dynamic = "force-dynamic";

export default async function TrainPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/train");

  const tz = user.settings.timezone;
  const [program, active, recent] = await Promise.all([
    getActiveProgram(user.id),
    getActiveSession(user.id),
    recentSessions(user.id, tz),
  ]);
  const next = program ? nextWorkoutOf(program) : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="muted text-xs uppercase tracking-wide">Träning</p>
          <h1 className="text-2xl font-semibold">{program ? program.name : "Inget program än"}</h1>
        </div>
        <Link className="btn px-4 py-2 text-sm" href="/">
          Hem
        </Link>
      </header>

      {active ? (
        <section className="card flex flex-col gap-3 border-accent/50">
          <div>
            <p className="muted text-xs uppercase tracking-wide">Pågående pass</p>
            <p className="text-xl font-semibold">{active.workoutName}</p>
          </div>
          <Link className="btn btn-primary w-full" href={`/train/session/${active.id}`}>
            Fortsätt passet
          </Link>
          <AbandonButton sessionId={active.id} />
        </section>
      ) : null}

      {!program ? (
        <section className="card flex flex-col gap-3">
          <p className="text-sm">
            Ett program är de pass du roterar mellan, till exempel Pass A, B och C. Varje pass har
            övningar med set och reps. Appen föreslår vilket pass som står på tur.
          </p>
          <Link className="btn btn-primary w-full" href="/train/program">
            Skapa program
          </Link>
        </section>
      ) : (
        <>
          {!active && next ? (
            <section className="card flex flex-col gap-3">
              <div>
                <p className="muted text-xs uppercase tracking-wide">Nästa pass</p>
                <p className="text-2xl font-semibold">{next.name}</p>
              </div>
              <ul className="flex flex-col gap-1 text-sm">
                {next.exercises.map((e) => (
                  <li key={e.exerciseId + e.name} className="flex justify-between gap-3">
                    <span>{e.name}</span>
                    <span className="muted tabular-nums">{fmtTarget(e)}</span>
                  </li>
                ))}
                {next.exercises.length === 0 ? <li className="muted">Inga övningar än.</li> : null}
              </ul>
              <StartButton workoutId={next.id} primary>
                Starta {next.name}
              </StartButton>
            </section>
          ) : null}

          <section className="card flex flex-col gap-3">
            <p className="muted text-xs uppercase tracking-wide">
              Rotation · {program.workouts.length} pass
            </p>
            <ol className="flex flex-col gap-2">
              {program.workouts.map((w) => {
                const isNext = next?.id === w.id;
                return (
                  <li
                    key={w.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                      isNext ? "border-accent/60" : "border-line"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {w.name}
                        {isNext ? <span className="text-accent ml-2 text-xs">på tur</span> : null}
                      </p>
                      <p className="muted truncate text-xs">
                        {w.exercises.length} övningar
                      </p>
                    </div>
                    {!active ? (
                      <div className="w-24 shrink-0">
                        <StartButton workoutId={w.id}>Starta</StartButton>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            <p className="muted text-xs">
              Du kan alltid välja ett annat pass. Rotationen flyttas först när ett pass avslutas.
            </p>
            <Link className="btn w-full" href="/train/program">
              Redigera program
            </Link>
          </section>
        </>
      )}

      {recent.length > 0 ? (
        <section className="card flex flex-col gap-2">
          <p className="muted text-xs uppercase tracking-wide">Senaste passen</p>
          <ul className="flex flex-col divide-y divide-line">
            {recent.map((s) => (
              <li key={s.id}>
                <Link className="flex items-center justify-between gap-3 py-2.5" href={`/train/session/${s.id}`}>
                  <span>
                    <span className="block font-medium">{s.workoutName}</span>
                    <span className="muted text-xs">{s.dateLabel}</span>
                  </span>
                  <span className="muted text-right text-xs tabular-nums">
                    {s.sets} set
                    {s.volumeKg > 0 ? ` · ${fmtNum(s.volumeKg, 0)} kg` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
