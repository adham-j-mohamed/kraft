import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { allowHit } from "@/lib/auth/attempts";
import { SESSION_COOKIE, SESSION_DAYS, appUrl, cookieSecure } from "@/lib/auth/config";
import { hashPassword } from "@/lib/auth/password";
import { normalizeUsername, validatePassword, validateUsername } from "@/lib/auth/credentials";
import { assertSameOrigin } from "@/lib/auth/origin";
import { MAX_PENDING } from "@/lib/auth/pending";
import { createSessionToken } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/db/errors";
import { getDb } from "@/lib/db";
import { userSettings, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const NOTE_MAX = 140;
/** Högst så här många förfrågningar per IP-adress och timme. */
const REGISTER_PER_HOUR = 5;

function fail(code: string, username?: string) {
  const url = new URL("/register", appUrl());
  url.searchParams.set("error", code);
  if (username) url.searchParams.set("username", username);
  return NextResponse.redirect(url, { status: 303 });
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

/**
 * Vem som helst kan skicka en förfrågan. Kontot skapas med status `pending` och
 * kan inte logga in förrän en admin godkänt det. Ingen session utfärdas här.
 *
 * Undantag: när Kraft saknar konton blir det första kontot admin och godkänns direkt
 * (så att en ny installation går att komma igång med). Låset hindrar två samtidiga
 * registreringar från att båda bli admin.
 */
export async function POST(request: Request) {
  const wrongOrigin = assertSameOrigin(request);
  if (wrongOrigin) return wrongOrigin;

  const form = await request.formData();

  // Osynligt fält som människor lämnar tomt. Fyllt av en bot → låtsas att det gick bra.
  if (String(form.get("website") ?? "").trim() !== "") {
    return NextResponse.redirect(new URL("/register/pending", appUrl()), { status: 303 });
  }

  if (!allowHit(`register|${clientIp(request)}`, REGISTER_PER_HOUR, 60 * 60 * 1000)) {
    return fail("rate");
  }

  const username = normalizeUsername(String(form.get("username") ?? ""));
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, NOTE_MAX);

  if (validateUsername(username)) return fail("username", username);
  if (validatePassword(password)) return fail("password", username);
  if (password !== confirm) return fail("confirm", username);

  const passwordHash = await hashPassword(password);
  const db = getDb();

  let result;
  try {
    result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('kraft_bootstrap'))`);
      const [{ count, pending }] = await tx
        .select({
          count: sql<number>`count(*)::int`,
          pending: sql<number>`count(*) filter (where ${users.status} = 'pending')::int`,
        })
        .from(users);

      const first = count === 0;
      if (!first && pending >= MAX_PENDING) return { kind: "full" as const };

      const [user] = await tx
        .insert(users)
        .values({
          username,
          passwordHash,
          name: username,
          role: first ? "admin" : "member",
          status: first ? "approved" : "pending",
          signupNote: note || null,
        })
        .returning();
      await tx.insert(userSettings).values({ userId: user.id }).onConflictDoNothing();
      return { kind: first ? ("first" as const) : ("pending" as const), user };
    });
  } catch (err) {
    if (isUniqueViolation(err)) return fail("taken", username);
    throw err;
  }

  if (result.kind === "full") return fail("full", username);

  if (result.kind === "pending") {
    return NextResponse.redirect(new URL("/register/pending", appUrl()), { status: 303 });
  }

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
