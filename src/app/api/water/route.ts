import { authed, readJson } from "@/lib/api";
import { addWater } from "@/lib/food/queries";
import { waterInput } from "@/lib/food/validate";

export const dynamic = "force-dynamic";

/** Lägger till eller drar ifrån vatten för en dag och svarar med dagens summa. */
export async function POST(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const body = await readJson(request, waterInput);
  if ("error" in body) return body.error;
  return Response.json({ ml: await addWater(a.user.id, body.data.date, body.data.deltaMl) });
}
