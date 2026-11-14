import { authed, jsonError, readJson } from "@/lib/api";
import { deleteEntry, updateEntry } from "@/lib/food/queries";
import { diaryPatch } from "@/lib/food/validate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: Ctx) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const { id } = await params;
  if (!UUID.test(id)) return jsonError("not_found", 404);
  const body = await readJson(request, diaryPatch);
  if ("error" in body) return body.error;
  const result = await updateEntry(a.user.id, id, body.data);
  if (result.ok) return Response.json({ entry: result.entry });
  return jsonError(result.error, result.error === "not_found" ? 404 : 400);
}

export async function DELETE(request: Request, { params }: Ctx) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const { id } = await params;
  if (!UUID.test(id) || !(await deleteEntry(a.user.id, id))) return jsonError("not_found", 404);
  return Response.json({ ok: true });
}
