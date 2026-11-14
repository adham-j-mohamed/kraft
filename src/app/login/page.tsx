import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const ERROR_TEXT: Record<string, string> = {
  invalid: "Fel användarnamn eller lösenord.",
  blocked: "För många misslyckade försök. Vänta 15 minuter och försök igen.",
  missing: "Fyll i både användarnamn och lösenord.",
  closed: "Registreringen är stängd. Be en admin skapa ett konto.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; username?: string; next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const db = getDb();
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  if (count === 0) redirect("/register");

  const params = await searchParams;
  const error = params.error ? (ERROR_TEXT[params.error] ?? "Inloggningen misslyckades.") : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">Kraft</span>
        <h1 className="text-3xl font-semibold">Träning och mat, i samma app.</h1>
        <p className="muted text-sm">
          Logga in för att spara pass, vikt och mat. Inget sparas bara i telefonen.
        </p>
      </div>

      {error ? (
        <div className="card border-danger/40 text-sm">
          <p>{error}</p>
        </div>
      ) : null}

      <form action="/api/auth/login" method="post" className="card flex flex-col gap-4">
        <input type="hidden" name="next" value={params.next ?? "/"} />
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
            autoComplete="current-password"
            required
          />
        </label>
        <button className="btn btn-primary w-full" type="submit">
          Logga in
        </button>
      </form>

      <p className="muted text-center text-xs">
        Har du inget konto? Be den som administrerar Kraft skapa ett åt dig. Appen öppnas som en
        hemsida: på iPhone, dela-knappen → Lägg till på hemskärmen.
      </p>
    </main>
  );
}
