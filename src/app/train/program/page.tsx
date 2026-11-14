import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { getActiveProgram } from "@/lib/training/queries";
import { ProgramEditor } from "./ProgramEditor";

export const dynamic = "force-dynamic";

export default async function ProgramPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/train/program");
  const program = await getActiveProgram(user.id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="muted text-xs uppercase tracking-wide">Träning</p>
          <h1 className="text-2xl font-semibold">{program ? "Redigera program" : "Nytt program"}</h1>
        </div>
        <Link className="btn px-4 py-2 text-sm" href="/train">
          Tillbaka
        </Link>
      </header>
      <ProgramEditor initial={program} />
    </main>
  );
}
