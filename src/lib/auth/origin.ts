import { NextResponse } from "next/server";
import { appUrl } from "./config";

/**
 * Skydd mot cross-site POST. Cookies är SameSite=Lax, så en främmande sajt får
 * inte med sessionen — men ett formulär mot en route som skapar konto behöver
 * ändå avvisas. Browsern skickar Origin på POST; curl gör det inte, och då
 * litar vi på anropet (samma beteende som en inloggad klient).
 */
export function assertSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const expected = new URL(appUrl()).origin;
  if (origin === expected) return null;
  return NextResponse.json({ error: "fel ursprung" }, { status: 403 });
}
