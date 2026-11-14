import type { ZodType } from "zod";
import { assertSameOrigin } from "@/lib/auth/origin";
import { getCurrentUser, type SessionUser } from "@/lib/auth/user";

export function jsonError(error: string, status: number, extra?: Record<string, unknown>) {
  return Response.json({ error, ...extra }, { status });
}

/**
 * Gemensam ingång för JSON-routes: främmande Origin på skrivande anrop avvisas,
 * och utan giltig session blir svaret 401. Returnerar antingen användaren eller
 * ett färdigt felsvar.
 */
export async function authed(request: Request): Promise<{ user: SessionUser } | { error: Response }> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    const wrongOrigin = assertSameOrigin(request);
    if (wrongOrigin) return { error: wrongOrigin };
  }
  const user = await getCurrentUser();
  if (!user) return { error: jsonError("unauthorized", 401) };
  return { user };
}

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<{ data: T } | { error: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: jsonError("bad_json", 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      error: jsonError("invalid", 400, {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      }),
    };
  }
  return { data: parsed.data };
}
