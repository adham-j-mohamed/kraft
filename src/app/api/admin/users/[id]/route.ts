import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { appUrl } from "@/lib/auth/config";
import { hashPassword } from "@/lib/auth/password";
import { validatePassword } from "@/lib/auth/credentials";
import { assertSameOrigin } from "@/lib/auth/origin";
import { getCurrentUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function back(code: string) {
  const url = new URL("/admin/users", appUrl());
  url.searchParams.set(code, "1");
  return NextResponse.redirect(url, { status: 303 });
}

async function adminCount(): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "admin"));
  return row?.count ?? 0;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const wrongOrigin = assertSameOrigin(request);
  if (wrongOrigin) return wrongOrigin;

  const session = await getCurrentUser();
  if (!session) return NextResponse.redirect(new URL("/login", appUrl()), { status: 303 });
  if (session.role !== "admin") return back("error_forbidden");

  const { id } = await params;
  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return back("error_missing");

  const form = await request.formData();
  const action = String(form.get("action") ?? "");

  if (action === "reset_password") {
    const password = String(form.get("password") ?? "");
    if (validatePassword(password)) return back("error_password");
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password), passwordUpdatedAt: new Date() })
      .where(eq(users.id, id));
    return back("ok_reset");
  }

  if (action === "set_role") {
    const role = String(form.get("role") ?? "member") === "admin" ? "admin" : "member";
    if (target.role === "admin" && role !== "admin" && (await adminCount()) <= 1) {
      return back("error_last_admin");
    }
    await db.update(users).set({ role }).where(eq(users.id, id));
    return back("ok_role");
  }

  if (action === "delete") {
    if (target.id === session.id) return back("error_self");
    if (target.role === "admin" && (await adminCount()) <= 1) return back("error_last_admin");
    await db.delete(users).where(eq(users.id, id));
    return back("ok_delete");
  }

  return back("error_action");
}
