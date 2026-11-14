import { authed, jsonError, readJson } from "@/lib/api";
import { createFood, searchFoods } from "@/lib/food/queries";
import { foodInput } from "@/lib/food/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json({ foods: await searchFoods(a.user.id, q) });
}

export async function POST(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const body = await readJson(request, foodInput);
  if ("error" in body) return body.error;
  const result = await createFood(a.user.id, body.data);
  if (!result.ok) return jsonError(result.error, 409);
  return Response.json({ food: result.food }, { status: 201 });
}
