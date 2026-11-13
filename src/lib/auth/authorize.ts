import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { invites, userSettings, users } from "@/lib/db/schema";
import type { GoogleClaims } from "./google";

export type AuthorizeResult =
  | { ok: true; userId: string; email: string; role: string }
  | { ok: false; reason: "no_invite" | "revoked" };

/**
 * Regler:
 *  1. Finns kontot sedan tidigare → in.
 *  2. Är användartabellen tom → första inloggningen blir admin (bootstrap).
 *  3. ADMIN_EMAIL matchar → admin (används för att låsa upp en installerad app).
 *  4. Finns en aktiv inbjudan på adressen → member.
 *  5. Annars nej. Ingen självregistrering.
 */
export async function authorizeGoogleUser(claims: GoogleClaims): Promise<AuthorizeResult> {
  const db = getDb();
  const email = claims.email.trim().toLowerCase();

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    await db
      .update(users)
      .set({
        googleSub: claims.sub,
        name: claims.name ?? existing[0].name,
        avatarUrl: claims.picture ?? existing[0].avatarUrl,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, existing[0].id));
    return { ok: true, userId: existing[0].id, email, role: existing[0].role };
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isAdmin = count === 0 || (!!adminEmail && adminEmail === email);

  let invited: typeof invites.$inferSelect | undefined;
  if (!isAdmin) {
    const rows = await db
      .select()
      .from(invites)
      .where(and(eq(invites.email, email), isNull(invites.revokedAt)))
      .limit(1);
    invited = rows[0];
    if (!invited) return { ok: false, reason: "no_invite" };
  }

  const [created] = await db
    .insert(users)
    .values({
      googleSub: claims.sub,
      email,
      name: claims.name ?? null,
      avatarUrl: claims.picture ?? null,
      role: isAdmin ? "admin" : "member",
      lastLoginAt: new Date(),
    })
    .returning();

  await db.insert(userSettings).values({ userId: created.id }).onConflictDoNothing();
  if (invited) {
    await db
      .update(invites)
      .set({ acceptedAt: new Date() })
      .where(eq(invites.email, email));
  }

  return { ok: true, userId: created.id, email, role: created.role };
}
