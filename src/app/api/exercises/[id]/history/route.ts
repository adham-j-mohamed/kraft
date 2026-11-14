import { authed, jsonError } from "@/lib/api";
import { exerciseHistory } from "@/lib/training/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const { id } = await params;
  const history = await exerciseHistory(a.user.id, id, a.user.settings.timezone);
  if (!history) return jsonError("not_found", 404);
  return Response.json(history);
}
