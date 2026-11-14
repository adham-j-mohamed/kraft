import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS, appUrl, cookieSecure, safeNext } from "@/lib/auth/config";
import { dummyHash, verifyPassword } from "@/lib/auth/password";
import { normalizeUsername } from "@/lib/auth/credentials";
import { clearFailures, isBlocked, loginKey, recordFailure } from "@/lib/auth/attempts";
import { assertSameOrigin } from "@/lib/auth/origin";
import { createSessionToken } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function fail(code: string, username?: string) {
  const url = new URL("/login", appUrl());
  url.searchParams.set("error", code);
  if (username) url.searchParams.set("username", username);
  return NextResponse.redirect(url, { status: 303 });
}

/** Cloudflare sätter CF-Connecting-IP; annars första ledet i X-Forwarded-For. */
function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

export async function POST(request: Request) {
  const wrongOrigin = assertSameOrigin(request);
  if (wrongOrigin) return wrongOrigin;

  const form = await request.formData();
  const username = normalizeUsername(String(form.get("username") ?? ""));
  const password = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? ""));

  if (!username || !password) return fail("missing", username);

  const key = loginKey(clientIp(request), username);
  if (isBlocked(key)) return fail("blocked", username);

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  // Jämför alltid mot en hash, även när kontot saknas, så svarstiden inte röjer
  // vilka användarnamn som finns.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));

  if (!user || !ok) {
    recordFailure(key);
    return fail("invalid", username);
  }

  clearFailures(key);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

  return NextResponse.redirect(new URL(next, appUrl()), { status: 303 });
}
