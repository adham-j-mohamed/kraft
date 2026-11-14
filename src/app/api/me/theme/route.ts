import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { appUrl } from "@/lib/auth/config";
import { assertSameOrigin } from "@/lib/auth/origin";
import { requireUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db";
import { userSettings, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const VALID = new Set(["dark", "light", "system"] as const);

export async function POST(request: Request) {
  const wrongOrigin = assertSameOrigin(request);
  if (wrongOrigin) return wrongOrigin;

  const session = await requireUser();
  const form = await request.formData();
  const theme = String(form.get("theme") ?? "system");
  if (!VALID.has(theme as any)) return NextResponse.redirect(new URL("/settings?error_theme=1", appUrl()));

  const db = getDb();
  await db.update(userSettings).set({ theme }).where(eq(userSettings.userId, session.id));
  return NextResponse.redirect(new URL("/settings?ok_theme=1", appUrl()));
}
