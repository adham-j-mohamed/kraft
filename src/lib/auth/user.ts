import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { userSettings, users } from "@/lib/db/schema";
import { SESSION_COOKIE } from "./config";
import { verifySessionToken } from "./session";

export interface SessionUser {
  id: string;
  username: string;
  name: string | null;
  role: "admin" | "member";
  settings: typeof userSettings.$inferSelect;
}

/**
 * Null när ingen giltig session finns. Anropas i server components och routes.
 * `cache` gör att layout och sida delar ett uppslag per förfrågan.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const userId = session.userId;

  const db = getDb();
  const rows = await db
    .select({ user: users, settings: userSettings })
    .from(users)
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Ett konto som väntar på godkännande har ingen session; den här kontrollen gäller
  // även om en token skulle ha utfärdats på annat sätt.
  if (row.user.status !== "approved") return null;

  // Byt lösenord ⇒ äldre sessioner slutar gälla. `iat` har sekundupplösning, så
  // en token som utfärdats i samma sekund som bytet får leva en sekund till.
  if (row.user.passwordUpdatedAt && row.user.passwordUpdatedAt.getTime() > (session.issuedAt + 1) * 1000) {
    return null;
  }

  // Första inloggningen skapar inställningsraden; här self-healar vi om den saknas.
  let settings = row.settings;
  if (!settings) {
    const inserted = await db
      .insert(userSettings)
      .values({ userId })
      .onConflictDoNothing()
      .returning();
    settings = inserted[0] ?? null;
  }
  if (!settings) return null;

  return {
    id: row.user.id,
    username: row.user.username,
    name: row.user.name,
    role: row.user.role === "admin" ? "admin" : "member",
    settings,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Response("unauthorized", { status: 401 });
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Response("forbidden", { status: 403 });
  return user;
}
