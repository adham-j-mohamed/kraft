import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  STATE_COOKIE,
  VERIFIER_COOKIE,
  appUrl,
  cookieSecure,
} from "@/lib/auth/config";
import { generateCodeVerifier, generateState, googleClient } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const state = generateState();
    const verifier = generateCodeVerifier();
    const url = googleClient().createAuthorizationURL(state, verifier, [
      "openid",
      "email",
      "profile",
    ]);

    const store = await cookies();
    const opts = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: cookieSecure(),
      path: "/",
      maxAge: 600,
    };
    store.set(STATE_COOKIE, state, opts);
    store.set(VERIFIER_COOKIE, verifier, opts);

    const target = new URL(request.url).searchParams.get("next");
    if (target && target.startsWith("/")) {
      store.set("kraft_oauth_next", target, opts);
    }
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "okänt fel";
    return NextResponse.redirect(
      new URL(`/login?error=config&detail=${encodeURIComponent(message)}`, appUrl()),
    );
  }
}
