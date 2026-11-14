import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db";
import { todayInZone } from "@/lib/dates";
import { getActiveProgram, getActiveSession, nextWorkoutOf } from "@/lib/training/queries";
import { fmtTarget } from "@/lib/training/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const today = todayInZone(user.settings.timezone);

  const [program, active, status] = await Promise.all([
    getActiveProgram(user.id),
    getActiveSession(user.id),
    db.execute<{ now: string }>(sql`select now()::text as now`),
  ]);
  const next = program ? nextWorkoutOf(program) : null;

  const kcal = user.settings.kcalTarget;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="muted text-xs">{today}</p>
          <h1 className="text-2xl font-semibold">Hej {user.name ?? user.username}</h1>
        </div>
        <div className="flex gap-2">
          <Link className="btn px-4 py-2 text-sm" href="/train">
            Träning
          </Link>
          <Link className="btn px-4 py-2 text-sm" href="/settings">
            Inställningar
          </Link>
          {user.role === "admin" ? (
            <Link className="btn px-4 py-2 text-sm" href="/admin/users">
              Användare
            </Link>
          ) : null}
        </div>
      </header>

      <section className="card flex flex-col gap-1">
        <p className="muted text-xs uppercase tracking-wide">Kalorier idag</p>
        <p className="text-3xl font-semibold tabular-nums">
          {kcal ? `0 / ${kcal} kcal` : "Mål ej satt"}
        </p>
        <p className="muted text-sm">
          {kcal
            ? `${kcal} kcal kvar att äta`
            : "Sätt längd, vikt och aktivitetsnivå under Mål för att räkna ut målet."}
        </p>
      </section>

      <section className="card flex flex-col gap-3">
        <p className="muted text-xs uppercase tracking-wide">{active ? "Pågående pass" : "Nästa pass"}</p>
        {active ? (
          <>
            <p className="text-xl font-semibold">{active.workoutName}</p>
            <Link className="btn btn-primary w-full" href={`/train/session/${active.id}`}>
              Fortsätt passet
            </Link>
          </>
        ) : next ? (
          <>
            <p className="text-xl font-semibold">{next.name}</p>
            <p className="muted text-sm">
              {next.exercises
                .slice(0, 3)
                .map((e) => `${e.name} ${fmtTarget(e)}`)
                .join(" · ")}
              {next.exercises.length > 3 ? ` · +${next.exercises.length - 3}` : ""}
            </p>
            <Link className="btn btn-primary w-full" href="/train">
              Öppna träningen
            </Link>
          </>
        ) : (
          <>
            <p className="text-xl font-semibold">Inget program än</p>
            <p className="muted text-sm">Skapa pass A, B, C … med övningar, set och reps.</p>
            <Link className="btn btn-primary w-full" href="/train/program">
              Skapa program
            </Link>
          </>
        )}
      </section>

      <section className="card text-sm">
        <p className="muted text-xs uppercase tracking-wide">Status</p>
        <ul className="mt-2 space-y-1">
          <li>Databas: ansluten ({status.rows[0]?.now.slice(0, 16)})</li>
          <li>
            Inloggning: {user.username} ({user.role === "admin" ? "admin" : "medlem"})
          </li>
          <li>Träning: program, pass och förra passet. Mat byggs härnäst.</li>
        </ul>
      </section>
    </main>
  );
}
