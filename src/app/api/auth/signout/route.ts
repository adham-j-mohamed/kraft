import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, appUrl } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/login", appUrl()), { status: 303 });
}
