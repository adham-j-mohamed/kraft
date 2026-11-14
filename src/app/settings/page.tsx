import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";

export const dynamic = "force-dynamic";

const MESSAGE_TEXT: Record<string, string> = {
  ok: "Lösenordet är bytt. Äldre sessioner på andra enheter loggas ut.",
  error_password: "Det nya lösenordet måste vara minst 8 tecken.",
  error_confirm: "De nya lösenorden stämmer inte överens.",
  error_current: "Det nuvarande lösenordet stämmer inte.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error_password?: string; error_confirm?: string; error_current?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");

  const params = await searchParams;
  const messageKey = ["ok", "error_password", "error_confirm", "error_current"].find(
    (key) => params[key as keyof typeof params] === "1",
  );
  const message = messageKey ? MESSAGE_TEXT[messageKey] : null;
  const isError = messageKey?.startsWith("error_");

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="muted text-xs uppercase tracking-wide">Inställningar</p>
          <h1 className="text-2xl font-semibold">{user.name ?? user.username}</h1>
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

      <section className="card flex flex-col gap-2 text-sm">
        <p className="muted text-xs uppercase tracking-wide">Konto</p>
        <p>
          Användarnamn: <strong>{user.username}</strong>
        </p>
        <p>Roll: {user.role === "admin" ? "admin" : "medlem"}</p>
        <p className="muted text-xs">Tidszon: {user.settings.timezone}</p>
      </section>

      <form action="/api/auth/password" method="post" className="card flex flex-col gap-4">
        <p className="muted text-xs uppercase tracking-wide">Byt lösenord</p>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="muted text-xs">Nuvarande lösenord</span>
          <input className="input" type="password" name="current" autoComplete="current-password" required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="muted text-xs">Nytt lösenord</span>
          <input
            className="input"
            type="password"
            name="next"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="muted text-xs">Repetera nytt lösenord</span>
          <input
            className="input"
            type="password"
            name="confirm"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <button className="btn w-full" type="submit">
          Byt lösenord
        </button>
      </form>

      <form action="/api/auth/logout" method="post">
        <button className="btn w-full" type="submit">
          Logga ut
        </button>
      </form>
    </main>
  );
}
