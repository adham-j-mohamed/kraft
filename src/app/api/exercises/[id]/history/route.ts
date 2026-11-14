import { authed, jsonError } from "@/lib/api";
import { getLocale } from "@/lib/i18n/server";
import { exerciseHistory } from "@/lib/training/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const { id } = await params;
  const history = await exerciseHistory(a.user.id, id, {
    timeZone: a.user.settings.timezone,
    locale: await getLocale(),
  });
  if (!history) return jsonError("not_found", 404);
  return Response.json(history);
}
