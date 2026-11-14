import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/user";
import { THEME_COOKIE, isTheme, resolveTheme, type Theme } from "./theme";

/** Temat för den här förfrågan. Slår bara upp kontot när ingen kaka finns. */
export async function getTheme(): Promise<Theme> {
  const cookie = (await cookies()).get(THEME_COOKIE)?.value;
  if (isTheme(cookie)) return cookie;
  const user = await getCurrentUser().catch(() => null);
  return resolveTheme(undefined, user?.settings.theme);
}
