import { authed, jsonError, readJson } from "@/lib/api";
import { todayInZone } from "@/lib/dates";
import { deleteWeight, logWeight, weightHistory } from "@/lib/food/queries";
import { weightInput } from "@/lib/food/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  return Response.json({ weights: await weightHistory(a.user.id, todayInZone(a.user.settings.timezone)) });
}

/** En vägning per dag; en ny för samma dag ersätter den förra. */
export async function POST(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const body = await readJson(request, weightInput);
  if ("error" in body) return body.error;
  await logWeight(a.user.id, body.data.date, body.data.weightKg);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(await deleteWeight(a.user.id, date))) return jsonError("not_found", 404);
  return Response.json({ ok: true });
}
