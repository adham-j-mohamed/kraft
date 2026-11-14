import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { jsonError } from "@/lib/api";
import { cookieSecure } from "@/lib/auth/config";
import { assertSameOrigin } from "@/lib/auth/origin";
import { getCurrentUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { THEME_COOKIE, isTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";

/**
 * Sätter temat. Kakan gäller den här enheten och funkar även utloggat; är man inloggad
 * sparas valet dessutom på kontot så att en ny enhet får samma tema efter inloggning.
 */
export async function POST(request: Request) {
  const wrongOrigin = assertSameOrigin(request);
  if (wrongOrigin) return wrongOrigin;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_json", 400);
  }
  const theme = (body as { theme?: unknown } | null)?.theme;
  if (!isTheme(theme)) return jsonError("invalid", 400);

  (await cookies()).set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: cookieSecure(),
    httpOnly: true,
  });

  const user = await getCurrentUser();
  if (user) {
    await getDb()
      .update(userSettings)
      .set({ theme, updatedAt: new Date() })
      .where(eq(userSettings.userId, user.id));
  }
  return Response.json({ ok: true, theme, saved: user !== null });
}
