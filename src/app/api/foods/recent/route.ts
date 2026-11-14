import { authed } from "@/lib/api";
import { favoriteFoods, recentFoods } from "@/lib/food/queries";

export const dynamic = "force-dynamic";

/** Senast använda och favoriter — det man oftast vill lägga till igen. */
export async function GET(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const [recent, favorites] = await Promise.all([recentFoods(a.user.id), favoriteFoods(a.user.id)]);
  return Response.json({ recent, favorites });
}
