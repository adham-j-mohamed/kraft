import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS, appUrl, cookieSecure } from "@/lib/auth/config";
import { hashPassword } from "@/lib/auth/password";
import { normalizeUsername, validatePassword, validateUsername } from "@/lib/auth/credentials";
import { assertSameOrigin } from "@/lib/auth/origin";
import { createSessionToken } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { userSettings, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function fail(code: string, username?: string) {
  const url = new URL("/register", appUrl());
  url.searchParams.set("error", code);
  if (username) url.searchParams.set("username", username);
  return NextResponse.redirect(url, { status: 303 });
}

/**
 * Första kontot blir admin. Registreringen stänger sig själv i samma stund som
 * första raden finns — därefter skapar admin konton på /admin/users.
 * Låset hindrar två samtidiga registreringar från att båda bli admin.
 */
export async function POST(request: Request) {
  const wrongOrigin = assertSameOrigin(request);
  if (wrongOrigin) return wrongOrigin;

  const form = await request.formData();
  const username = normalizeUsername(String(form.get("username") ?? ""));
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (validateUsername(username)) return fail("username", username);
  if (validatePassword(password)) return fail("password", username);
  if (password !== confirm) return fail("confirm", username);

  const passwordHash = await hashPassword(password);
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('kraft_bootstrap'))`);
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(users);
    if (count > 0) return { ok: false as const, reason: "closed" as const };

    const [user] = await tx
      .insert(users)
      .values({ username, passwordHash, name: username, role: "admin" })
      .returning();
    await tx.insert(userSettings).values({ userId: user.id }).onConflictDoNothing();
    return { ok: true as const, user };
  });

  if (!result.ok) return fail("closed", username);

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(result.user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

  return NextResponse.redirect(new URL("/", appUrl()), { status: 303 });
}
