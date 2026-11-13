import { and, eq, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  appUrl,
  cookieSecure,
} from "@/lib/auth/config";
import { createSessionToken } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { invites, userSettings, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * Tillfällig inloggning utan Google, bara för att kunna bygga och mäta innan
 * OAuth-klienten finns. Avstängd om inte ALLOW_DEV_LOGIN=1.
 */
export async function GET(request: Request) {
  if (process.env.ALLOW_DEV_LOGIN !== "1") {
    return new NextResponse("dev-inloggning är avstängd", { status: 403 });
  }
  const url = new URL(request.url);
  const email = (url.searchParams.get("email") ?? "dev@kraft.local").toLowerCase();
  const db = getDb();

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let user = existing[0];

  if (!user) {
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    const isFirst = countRows[0].count === 0;

    const invited = isFirst
      ? undefined
      : (
          await db
            .select()
            .from(invites)
            .where(and(eq(invites.email, email), isNull(invites.revokedAt)))
            .limit(1)
        )[0];

    if (!isFirst && !invited) {
      return new NextResponse("adressen är inte inbjuden", { status: 403 });
    }

    const inserted = await db
      .insert(users)
      .values({
        googleSub: `dev:${email}`,
        email,
        name: email.split("@")[0],
        role: isFirst ? "admin" : "member",
      })
      .returning();
    user = inserted[0];
    await db.insert(userSettings).values({ userId: user.id }).onConflictDoNothing();
  }

  const token = await createSessionToken(user.id);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return NextResponse.redirect(new URL("/", appUrl()));
}
