import { NextResponse } from "next/server";
import { appUrl } from "@/lib/auth/config";
import { hashPassword } from "@/lib/auth/password";
import { normalizeUsername, validatePassword, validateUsername } from "@/lib/auth/credentials";
import { assertSameOrigin } from "@/lib/auth/origin";
import { getCurrentUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db";
import { userSettings, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function back(code: string) {
  const url = new URL("/admin/users", appUrl());
  url.searchParams.set(code, "1");
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const wrongOrigin = assertSameOrigin(request);
  if (wrongOrigin) return wrongOrigin;

  const session = await getCurrentUser();
  if (!session) return NextResponse.redirect(new URL("/login", appUrl()), { status: 303 });
  if (session.role !== "admin") return back("error_forbidden");

  const form = await request.formData();
  const username = normalizeUsername(String(form.get("username") ?? ""));
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role") ?? "member") === "admin" ? "admin" : "member";

  if (validateUsername(username)) return back("error_username");
  if (validatePassword(password)) return back("error_password");

  const db = getDb();
  const passwordHash = await hashPassword(password);

  try {
    const [created] = await db
      .insert(users)
      .values({ username, passwordHash, name: username, role })
      .returning();
    await db.insert(userSettings).values({ userId: created.id }).onConflictDoNothing();
  } catch {
    // Unik index på username: namnet är upptaget.
    return back("error_taken");
  }

  return back("ok");
}
