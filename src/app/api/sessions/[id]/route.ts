import { authed, jsonError, readJson } from "@/lib/api";
import { getLocale } from "@/lib/i18n/server";
import { finishSession, loadSession } from "@/lib/training/queries";
import { finishSessionInput } from "@/lib/training/validate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const session = await loadSession(a.user.id, (await params).id, {
    timeZone: a.user.settings.timezone,
    locale: await getLocale(),
  });
  if (!session) return jsonError("not_found", 404);
  return Response.json({ session });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const body = await readJson(request, finishSessionInput);
  if ("error" in body) return body.error;
  const result = await finishSession(a.user.id, (await params).id, body.data.status);
  if (result.ok) return Response.json({ ok: true });
  return jsonError(result.error, result.error === "not_found" ? 404 : result.error === "not_active" ? 409 : 400);
}
