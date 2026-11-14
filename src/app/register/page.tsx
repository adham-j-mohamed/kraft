import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const ERROR_TEXT: Record<string, string> = {
  username: "Användarnamnet är ogiltigt. 3–32 tecken: a–z, 0–9, punkt, bindestreck, understreck.",
  password: "Lösenordet måste vara minst 8 tecken.",
  confirm: "Lösenorden stämmer inte överens.",
  closed: "Registreringen är stängd. Be en admin skapa ett konto.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; username?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const db = getDb();
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  if (count > 0) redirect("/login");

  const params = await searchParams;
  const error = params.error ? (ERROR_TEXT[params.error] ?? "Registreringen misslyckades.") : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">Kraft</span>
        <h1 className="text-3xl font-semibold">Första kontot blir admin.</h1>
        <p className="muted text-sm">
          Registreringen är öppen bara så länge Kraft saknar konton. Sedan skapar admin nya konton
          under Admin → Användare.
        </p>
      </div>

      {error ? (
        <div className="card border-danger/40 text-sm">
          <p>{error}</p>
        </div>
      ) : null}

      <form action="/api/auth/register" method="post" className="card flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="muted text-xs uppercase tracking-wide">Användarnamn</span>
          <input
            className="input"
            type="text"
            name="username"
            defaultValue={params.username ?? ""}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="muted text-xs uppercase tracking-wide">Lösenord</span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="muted text-xs uppercase tracking-wide">Repetera lösenord</span>
          <input
            className="input"
            type="password"
            name="confirm"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <button className="btn btn-primary w-full" type="submit">
          Skapa konto
        </button>
      </form>
    </main>
  );
}
