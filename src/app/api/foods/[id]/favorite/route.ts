import { authed, jsonError, readJson } from "@/lib/api";
import { setFavorite } from "@/lib/food/queries";
import { favoriteInput } from "@/lib/food/validate";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const { id } = await params;
  const body = await readJson(request, favoriteInput);
  if ("error" in body) return body.error;
  if (!UUID.test(id) || !(await setFavorite(a.user.id, id, body.data.on))) return jsonError("not_found", 404);
  return Response.json({ ok: true, favorite: body.data.on });
}
