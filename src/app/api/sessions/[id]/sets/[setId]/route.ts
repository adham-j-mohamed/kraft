import { authed, jsonError, readJson } from "@/lib/api";
import { deleteSet, updateSet } from "@/lib/training/queries";
import { patchSetInput } from "@/lib/training/validate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; setId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const body = await readJson(request, patchSetInput);
  if ("error" in body) return body.error;
  const { id, setId } = await params;
  const set = await updateSet(a.user.id, id, setId, body.data);
  if (!set) return jsonError("not_found", 404);
  return Response.json({ set });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const { id, setId } = await params;
  if (!(await deleteSet(a.user.id, id, setId))) return jsonError("not_found", 404);
  return Response.json({ ok: true });
}
