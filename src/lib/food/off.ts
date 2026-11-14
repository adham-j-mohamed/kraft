/**
 * Uppslag av streckkoder hos Open Food Facts (öppen, ideell databas, ODbL).
 *
 * Anropet görs från servern, så Open Food Facts får bara streckkoden — inte vem som frågar eller
 * var från. Tidsgräns, inget kontaktuppgifter i User-Agent, och data valideras innan den får
 * hamna i `foods`: databasen är öppen för alla att redigera och innehåller fel.
 */
import type { FoodInput } from "./validate";

const ENDPOINT = "https://world.openfoodfacts.org/api/v2/product";
const FIELDS = "code,product_name,product_name_sv,generic_name,brands,nutriments,serving_quantity,serving_size";
export const OFF_TIMEOUT_MS = 6000;

export type OffResult =
  | { kind: "found"; food: FoodInput }
  | { kind: "not_found" }
  /** Produkten finns men saknar (eller har orimliga) näringsvärden. `name` kan förifylla ett eget livsmedel. */
  | { kind: "no_nutrition"; name: string | null }
  | { kind: "error" };

const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
};

/** Ren funktion: gör om ett svar från Open Food Facts till ett livsmedel, eller säger varför inte. */
export function parseOffProduct(json: unknown, code: string): OffResult {
  const root = json as { status?: number; product?: Record<string, unknown> } | null;
  if (!root || root.status !== 1 || !root.product) return { kind: "not_found" };
  const p = root.product;
  const n = (p.nutriments ?? {}) as Record<string, unknown>;

  const name = clean(p.product_name_sv, 100) ?? clean(p.product_name, 100) ?? clean(p.generic_name, 100);
  if (!name) return { kind: "no_nutrition", name: null };

  // kcal direkt, annars från kJ (1 kcal = 4,184 kJ).
  const kcal100 = num(n["energy-kcal_100g"]) ?? (num(n["energy_100g"]) != null ? (num(n["energy_100g"]) as number) / 4.184 : null);
  const protein = num(n["proteins_100g"]);
  const carbs = num(n["carbohydrates_100g"]);
  const fat = num(n["fat_100g"]);
  if (kcal100 == null || protein == null || carbs == null || fat == null) return { kind: "no_nutrition", name };

  const inRange = (x: number, max: number) => x >= 0 && x <= max;
  // Rena fetter är ~900 kcal/100 g. Allt över ~950 eller mer än 100 g makron per 100 g är ett datafel.
  if (!inRange(kcal100, 950) || !inRange(protein, 100) || !inRange(carbs, 100) || !inRange(fat, 100) || protein + carbs + fat > 105) {
    return { kind: "no_nutrition", name };
  }

  const opt = (v: unknown) => {
    const x = num(v);
    return x != null && inRange(x, 100) ? Math.round(x * 100) / 100 : null;
  };
  const servingG = num(p.serving_quantity);
  const brand = clean(typeof p.brands === "string" ? p.brands.split(",")[0] : null, 60);

  return {
    kind: "found",
    food: {
      name,
      brand,
      barcode: code,
      kcal100g: Math.round(kcal100 * 10) / 10,
      protein100g: Math.round(protein * 100) / 100,
      carbs100g: Math.round(carbs * 100) / 100,
      fat100g: Math.round(fat * 100) / 100,
      fiber100g: opt(n["fiber_100g"]),
      sugar100g: opt(n["sugars_100g"]),
      salt100g: opt(n["salt_100g"]),
      servingGrams: servingG != null && servingG >= 1 && servingG <= 5000 ? servingG : null,
      servingLabel: servingG != null && servingG >= 1 && servingG <= 5000 ? clean(p.serving_size, 40) : null,
    },
  };
}

/** Okända koder kommer ofta igen (samma produkt skannas om); kom ihåg dem en stund. */
const missing = new Map<string, number>();
const MISSING_TTL_MS = 10 * 60 * 1000;

export function knownMissing(code: string, now = Date.now()): boolean {
  const until = missing.get(code);
  if (!until) return false;
  if (until <= now) {
    missing.delete(code);
    return false;
  }
  return true;
}

export function rememberMissing(code: string, now = Date.now()): void {
  if (missing.size > 500) {
    for (const [k, v] of missing) if (v <= now) missing.delete(k);
  }
  missing.set(code, now + MISSING_TTL_MS);
}

export async function fetchOff(code: string): Promise<OffResult> {
  try {
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(code)}.json?fields=${FIELDS}`, {
      headers: { "user-agent": "Kraft self-hosted food tracker", accept: "application/json" },
      signal: AbortSignal.timeout(OFF_TIMEOUT_MS),
      cache: "no-store",
    });
    // 404 betyder "okänd produkt" hos Open Food Facts; andra fel är drift hos dem.
    if (res.status === 404) return { kind: "not_found" };
    if (!res.ok) return { kind: "error" };
    return parseOffProduct(await res.json(), code);
  } catch {
    return { kind: "error" };
  }
}
