import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS, appUrl, cookieSecure } from "@/lib/auth/config";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { validatePassword } from "@/lib/auth/credentials";
import { assertSameOrigin } from "@/lib/auth/origin";
import { createSessionToken } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function back(code: string) {
  const url = new URL("/settings", appUrl());
  url.searchParams.set(code, "1");
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const wrongOrigin = assertSameOrigin(request);
  if (wrongOrigin) return wrongOrigin;

  const session = await getCurrentUser();
  if (!session) return NextResponse.redirect(new URL("/login", appUrl()), { status: 303 });

  const form = await request.formData();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (validatePassword(next)) return back("error_password");
  if (next !== confirm) return back("error_confirm");

  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  if (!row || !(await verifyPassword(current, row.passwordHash))) return back("error_current");

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next), passwordUpdatedAt: new Date() })
    .where(eq(users.id, session.id));

  // passwordUpdatedAt ogiltigförklarar äldre tokens i getCurrentUser. Den här
  // enheten får en ny token, så den som just bytte lösenord blir kvar inloggad.
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(session.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

  return back("ok");
}
