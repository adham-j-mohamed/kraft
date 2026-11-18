import { authed, jsonError } from "@/lib/api";
import { createOrReplaceToken, revokeToken } from "@/lib/auth/api-token";

export const dynamic = "force-dynamic";

/** Skapar en ny hälsonyckel och ersätter den gamla. Klartexten visas bara här, en gång. */
export async function POST(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  return Response.json({ token: await createOrReplaceToken(a.user.id) });
}

export async function DELETE(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  if (!(await revokeToken(a.user.id))) return jsonError("not_found", 404);
  return Response.json({ ok: true });
}
