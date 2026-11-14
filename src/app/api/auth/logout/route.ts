import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, appUrl } from "@/lib/auth/config";
import { assertSameOrigin } from "@/lib/auth/origin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const wrongOrigin = assertSameOrigin(request);
  if (wrongOrigin) return wrongOrigin;

  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/login", appUrl()), { status: 303 });
}
