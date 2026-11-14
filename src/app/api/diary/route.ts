import { authed, jsonError, readJson } from "@/lib/api";
import { todayInZone } from "@/lib/dates";
import { addEntry, getDay } from "@/lib/food/queries";
import { diaryCreate } from "@/lib/food/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const date = new URL(request.url).searchParams.get("date") ?? todayInZone(a.user.settings.timezone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError("invalid", 400);
  return Response.json({ day: await getDay(a.user.id, date, a.user.settings) });
}

/** Loggar mat. Idempotent på `clientId` — samma post två gånger blir en rad. */
export async function POST(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const body = await readJson(request, diaryCreate);
  if ("error" in body) return body.error;
  const result = await addEntry(a.user.id, body.data);
  if (result.ok) return Response.json({ entry: result.entry }, { status: 201 });
  return jsonError(result.error, result.error === "food_not_found" ? 404 : result.error === "conflict" ? 409 : 400);
}
