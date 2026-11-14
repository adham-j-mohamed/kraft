import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const MESSAGE_TEXT: Record<string, string> = {
  ok: "Kontot är skapat.",
  ok_reset: "Lösenordet är satt. Personen loggas ut på andra enheter.",
  ok_role: "Rollen är ändrad.",
  ok_delete: "Kontot är borttaget.",
  error_username: "Användarnamnet är ogiltigt.",
  error_password: "Lösenordet måste vara minst 8 tecken.",
  error_taken: "Användarnamnet är upptaget.",
  error_forbidden: "Bara admin får göra det.",
  error_missing: "Kontot finns inte.",
  error_self: "Du kan inte ta bort ditt eget konto.",
  error_last_admin: "Minst en admin måste finnas kvar.",
  error_action: "Okänd åtgärd.",
};

function formatDate(value: Date | null): string {
  if (!value) return "aldrig";
  return value.toISOString().slice(0, 16).replace("T", " ");
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login?next=/admin/users");
  if (session.role !== "admin") redirect("/");

  const db = getDb();
  const rows = await db.select().from(users).orderBy(asc(users.createdAt));
  const params = await searchParams;
  const messageKey = Object.keys(MESSAGE_TEXT).find((key) => params[key] === "1");
  const message = messageKey ? MESSAGE_TEXT[messageKey] : null;
  const isError = messageKey?.startsWith("error_");

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="muted text-xs uppercase tracking-wide">Admin</p>
          <h1 className="text-2xl font-semibold">Användare</h1>
        </div>
        <Link className="btn px-4 py-2 text-sm" href="/">
          Tillbaka
        </Link>
      </header>

      {message ? (
        <div className={`card text-sm ${isError ? "border-danger/40" : "border-accent/40"}`}>
          <p>{message}</p>
        </div>
      ) : null}

      <form action="/api/admin/users" method="post" className="card flex flex-col gap-3">
        <p className="muted text-xs uppercase tracking-wide">Nytt konto</p>
        <input className="input" type="text" name="username" placeholder="användarnamn" required />
        <input
          className="input"
          type="password"
          name="password"
          placeholder="lösenord, minst 8 tecken"
          minLength={8}
          required
        />
        <select className="input" name="role" defaultValue="member">
          <option value="member">Medlem</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn btn-primary w-full" type="submit">
          Skapa konto
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <p className="muted text-xs uppercase tracking-wide">Konton ({rows.length})</p>
        {rows.map((row) => (
          <div key={row.id} className="card flex flex-col gap-3 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {row.username}
                  {row.id === session.id ? <span className="muted"> (du)</span> : null}
                </p>
                <p className="muted text-xs">
                  {row.role === "admin" ? "admin" : "medlem"} · skapad {formatDate(row.createdAt)} ·
                  senast inloggad {formatDate(row.lastLoginAt)}
                </p>
              </div>
            </div>

            <form action={`/api/admin/users/${row.id}`} method="post" className="flex gap-2">
              <input type="hidden" name="action" value="reset_password" />
              <input
                className="input"
                type="password"
                name="password"
                placeholder="nytt lösenord"
                minLength={8}
                required
              />
              <button className="btn px-4 text-xs" type="submit">
                Sätt
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              <form action={`/api/admin/users/${row.id}`} method="post">
                <input type="hidden" name="action" value="set_role" />
                <input type="hidden" name="role" value={row.role === "admin" ? "member" : "admin"} />
                <button className="btn px-3 py-2 text-xs" type="submit">
                  Gör till {row.role === "admin" ? "medlem" : "admin"}
                </button>
              </form>
              {row.id === session.id ? null : (
                <form action={`/api/admin/users/${row.id}`} method="post">
                  <input type="hidden" name="action" value="delete" />
                  <button className="btn border-danger/40 px-3 py-2 text-xs text-danger" type="submit">
                    Ta bort
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
