import { authed, jsonError } from "@/lib/api";
import { allowHit } from "@/lib/auth/attempts";
import { fetchOff, knownMissing, rememberMissing } from "@/lib/food/off";
import { cacheOffFood, findByBarcode } from "@/lib/food/queries";

export const dynamic = "force-dynamic";

/** Högst så här många uppslag mot Open Food Facts per användare och minut. */
const LOOKUPS_PER_MINUTE = 30;

/** EAN-13 skrivs ofta som UPC-A (12 siffror) och tvärtom: samma produkt, en inledande nolla. */
function variants(code: string): string[] {
  const out = [code];
  if (code.length === 12) out.push(`0${code}`);
  if (code.length === 13 && code.startsWith("0")) out.push(code.slice(1));
  return out;
}

/**
 * Streckkod → livsmedel. Ordning: egna och delade livsmedel i vår databas, därefter Open Food
 * Facts (och resultatet sparas). Svar: 200 med livsmedlet, 404 `not_found` (okänd produkt),
 * 404 `no_nutrition` (finns men saknar näringsvärden), 502 `lookup_failed` (databasen nåddes inte).
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const { code } = await params;
  if (!/^\d{8,14}$/.test(code)) return jsonError("invalid", 400);
  const codes = variants(code);

  const local = await findByBarcode(a.user.id, codes);
  if (local) return Response.json({ food: local, source: "local" });

  if (codes.every(knownMissing)) return jsonError("not_found", 404);
  if (!allowHit(`off|${a.user.id}`, LOOKUPS_PER_MINUTE, 60_000)) return jsonError("rate", 429);

  let name: string | null = null;
  let sawNoNutrition = false;
  let failed = false;
  for (const c of codes) {
    const res = await fetchOff(c);
    if (res.kind === "found") {
      const food = await cacheOffFood({ ...res.food, barcode: c });
      if (food) return Response.json({ food, source: "off" });
      failed = true;
    } else if (res.kind === "no_nutrition") {
      sawNoNutrition = true;
      name ??= res.name;
    } else if (res.kind === "error") {
      failed = true;
    }
  }
  if (sawNoNutrition) return jsonError("no_nutrition", 404, { name });
  if (failed) return jsonError("lookup_failed", 502);
  codes.forEach((c) => rememberMissing(c));
  return jsonError("not_found", 404);
}
