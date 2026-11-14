import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db";
import { programWorkouts } from "@/lib/db/schema";
import { todayInZone } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const today = todayInZone(user.settings.timezone);

  const workouts = await db
    .select({ id: programWorkouts.id, name: programWorkouts.name })
    .from(programWorkouts)
    .limit(3);
  const status = await db.execute<{ now: string }>(sql`select now()::text as now`);

  const kcal = user.settings.kcalTarget;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="muted text-xs">{today}</p>
          <h1 className="text-2xl font-semibold">Hej {user.name ?? user.username}</h1>
        </div>
        <div className="flex gap-2">
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

      <section className="card flex flex-col gap-1">
        <p className="muted text-xs uppercase tracking-wide">Nästa pass</p>
        <p className="text-xl font-semibold">
          {workouts.length === 0 ? "Inget program än" : workouts[0].name}
        </p>
        <p className="muted text-sm">
          Träningsdelen byggs härnäst: program, rotation och loggning mot förra passet.
        </p>
      </section>

      <section className="card text-sm">
        <p className="muted text-xs uppercase tracking-wide">Status</p>
        <ul className="mt-2 space-y-1">
          <li>Databas: ansluten ({status.rows[0]?.now.slice(0, 16)})</li>
          <li>
            Inloggning: {user.username} ({user.role === "admin" ? "admin" : "medlem"})
          </li>
          <li>Mat: dagbok och streckkod byggs efter träningen</li>
        </ul>
      </section>
    </main>
  );
}
