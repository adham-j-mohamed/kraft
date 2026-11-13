import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authorizeGoogleUser } from "@/lib/auth/authorize";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  STATE_COOKIE,
  VERIFIER_COOKIE,
  appUrl,
  cookieSecure,
} from "@/lib/auth/config";
import { googleClient, parseIdToken } from "@/lib/auth/google";
import { createSessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const store = await cookies();

  if (oauthError) return NextResponse.redirect(new URL(`/login?error=${oauthError}`, appUrl()));
  const savedState = store.get(STATE_COOKIE)?.value;
  const verifier = store.get(VERIFIER_COOKIE)?.value;
  if (!code || !state || !savedState || state !== savedState || !verifier) {
    return NextResponse.redirect(new URL("/login?error=state", appUrl()));
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
    const client = googleClient();
    const tokens = await client.validateAuthorizationCode(code, verifier);
    const claims = parseIdToken(tokens.idToken(), clientId);
    const result = await authorizeGoogleUser(claims);

    if (!result.ok) {
      return NextResponse.redirect(
        new URL(`/login?error=${result.reason}&email=${encodeURIComponent(claims.email)}`, appUrl()),
      );
    }

    const token = await createSessionToken(result.userId);
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure(),
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });
    store.delete(STATE_COOKIE);
    store.delete(VERIFIER_COOKIE);

    return NextResponse.redirect(new URL("/", appUrl()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "okänt fel";
    return NextResponse.redirect(
      new URL(`/login?error=token&detail=${encodeURIComponent(message)}`, appUrl()),
    );
  }
}
