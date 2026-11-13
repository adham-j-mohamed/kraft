import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";

export const dynamic = "force-dynamic";

const ERROR_TEXT: Record<string, string> = {
  config: "Inloggningen är inte konfigurerad än (Google-klient saknas på servern).",
  state: "Inloggningsförsöket gick ut eller kom från fel håll. Försök igen.",
  token: "Google-inloggningen kunde inte verifieras. Försök igen.",
  no_invite: "Den adressen är inte inbjuden till Kraft.",
  access_denied: "Du avbröt inloggningen hos Google.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; detail?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const params = await searchParams;
  const error = params.error ? (ERROR_TEXT[params.error] ?? "Inloggningen misslyckades.") : null;
  const devLogin = process.env.ALLOW_DEV_LOGIN === "1";

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
          {params.error === "no_invite" && params.email ? (
            <p className="muted mt-2 break-all">Adress: {params.email}</p>
          ) : null}
          {params.detail ? <p className="muted mt-2 break-all text-xs">{params.detail}</p> : null}
        </div>
      ) : null}

      <a className="btn btn-primary w-full" href="/api/auth/google/start">
        Fortsätt med Google
      </a>

      {devLogin ? (
        <a className="btn w-full" href="/api/auth/dev?email=dev@kraft.local">
          Tillfällig dev-inloggning
        </a>
      ) : null}

      <p className="muted text-center text-xs">
        Appen öppnas som en hemsida. På iPhone: dela-knappen → Lägg till på hemskärmen.
      </p>
    </main>
  );
}
