import { authed, jsonError } from "@/lib/api";
import { startOfWeek, todayInZone } from "@/lib/dates";
import { weekStats } from "@/lib/food/queries";

export const dynamic = "force-dynamic";

/** Veckan (måndag–söndag) som innehåller `date`: kcal, makron, vatten, vikt och pass per dag. */
export async function GET(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const date = new URL(request.url).searchParams.get("date") ?? todayInZone(a.user.settings.timezone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError("invalid", 400);
  return Response.json({ days: await weekStats(a.user.id, startOfWeek(date), a.user.settings.timezone) });
}
