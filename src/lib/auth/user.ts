import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { userSettings, users } from "@/lib/db/schema";
import { SESSION_COOKIE } from "./config";
import { verifySessionToken } from "./session";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "admin" | "member";
  settings: typeof userSettings.$inferSelect;
}

/** Null när ingen giltig session finns. Anropas i server components och routes. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifySessionToken(token);
  if (!userId) return null;

  const db = getDb();
  const rows = await db
    .select({ user: users, settings: userSettings })
    .from(users)
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

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
    email: row.user.email,
    name: row.user.name,
    avatarUrl: row.user.avatarUrl,
    role: row.user.role === "admin" ? "admin" : "member",
    settings,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Response("unauthorized", { status: 401 });
  return user;
}
