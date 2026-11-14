import { authed, jsonError, readJson } from "@/lib/api";
import { deleteFood, getFood, updateFood } from "@/lib/food/queries";
import { foodInput } from "@/lib/food/validate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: Ctx) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const { id } = await params;
  const food = UUID.test(id) ? await getFood(a.user.id, id) : null;
  if (!food) return jsonError("not_found", 404);
  return Response.json({ food });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const { id } = await params;
  if (!UUID.test(id)) return jsonError("not_found", 404);
  const body = await readJson(request, foodInput);
  if ("error" in body) return body.error;
  const result = await updateFood(a.user.id, id, body.data);
  if (!result.ok) return jsonError(result.error, result.error === "not_found" ? 404 : 409);
  return Response.json({ food: result.food });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const { id } = await params;
  if (!UUID.test(id) || !(await deleteFood(a.user.id, id))) return jsonError("not_found", 404);
  return Response.json({ ok: true });
}
