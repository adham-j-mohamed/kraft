/**
 * Tolkar värden från Genvägar. Appen skickar text, och på en svensk telefon blir
 * 82,3 kg just "82,3" — så både komma och punkt som decimaltecken ska fungera, och
 * enheten kan stå i ett eget fält eller efter talet ("82,3 kg").
 */

export interface Quantity {
  value: number;
  unit: string;
}

/** "1 250,5 ml" → { value: 1250.5, unit: "ml" }. Null om inget tal går att läsa. */
export function parseQuantity(raw: unknown, unitHint?: unknown): Quantity | null {
  let numberPart: string;
  let unit = typeof unitHint === "string" ? unitHint : "";
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    return { value: raw, unit };
  }
  if (typeof raw !== "string") return null;
  const m = raw.match(/^\s*(-?\d[\d\s .,]*)\s*(.*)$/s);
  if (!m) return null;
  numberPart = m[1].replace(/[\s ]/g, "");
  if (!unit) unit = m[2];
  const lastComma = numberPart.lastIndexOf(",");
  const lastDot = numberPart.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // Båda finns: det sista tecknet är decimaltecken, det andra tusentalsavskiljare.
    const dec = Math.max(lastComma, lastDot);
    numberPart = numberPart.slice(0, dec).replace(/[.,]/g, "") + "." + numberPart.slice(dec + 1);
  } else if (lastComma >= 0) {
    numberPart = numberPart.replace(",", ".");
  }
  const value = Number(numberPart);
  return Number.isFinite(value) ? { value, unit } : null;
}

function key(unit: string): string {
  return unit.toLowerCase().replace(/[^a-zå-ö]/g, "");
}

const KG_PER: Record<string, number> = {
  "": 1,
  kg: 1,
  kilogram: 1,
  g: 0.001,
  gram: 0.001,
  lb: 0.45359237,
  lbs: 0.45359237,
  pound: 0.45359237,
  pounds: 0.45359237,
  st: 6.35029318,
  stone: 6.35029318,
};

const ML_PER: Record<string, number> = {
  "": 1,
  ml: 1,
  milliliter: 1,
  millilitre: 1,
  l: 1000,
  liter: 1000,
  litre: 1000,
  dl: 100,
  cl: 10,
  floz: 29.5735295625,
  flozus: 29.5735295625,
  flozimp: 28.4130625,
  cup: 236.5882365,
  cups: 236.5882365,
  cupus: 236.5882365,
};

/** Kilo ur ett värde i valfri vanlig viktenhet. Null om enheten är okänd. */
export function toKg(q: Quantity): number | null {
  const f = KG_PER[key(q.unit)];
  return f === undefined ? null : q.value * f;
}

/** Milliliter ur ett värde i valfri vanlig volymenhet. Null om enheten är okänd. */
export function toMl(q: Quantity): number | null {
  const f = ML_PER[key(q.unit)];
  return f === undefined ? null : q.value * f;
}
