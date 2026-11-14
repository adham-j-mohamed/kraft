import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { loadSession } from "@/lib/training/queries";
import { SessionLogger } from "./SessionLogger";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/train/session/${id}`);

  // Ogiltigt uuid-format ger ett databasfel; behandla det som "finns inte".
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const session = await loadSession(user.id, id, user.settings.timezone);
  if (!session) notFound();

  // `key` på status gör att komponenten startar om i läsläge när passet avslutas.
  return <SessionLogger key={session.status} initial={session} />;
}
