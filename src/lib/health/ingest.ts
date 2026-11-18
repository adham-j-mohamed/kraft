import { z } from "zod";
import { addDays, todayInZone } from "@/lib/dates";
import { logWeight, setWaterAtLeast } from "@/lib/food/queries";
import { parseQuantity, toKg, toMl } from "./units";

/**
 * Det Genvägar skickar. Allt är valfritt, och tomma strängar räknas som "ingen data":
 * en dag utan vattenmätning i Hälsa ska inte bli ett fel som får genvägen att larma.
 */
export const ingestInput = z.object({
  weight: z.union([z.number(), z.string()]).optional(),
  weightUnit: z.string().max(32).optional(),
  water: z.union([z.number(), z.string()]).optional(),
  waterUnit: z.string().max(32).optional(),
  /** YYYY-MM-DD i användarens tidszon; utan den används dagens datum. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type IngestInput = z.infer<typeof ingestInput>;

export interface IngestResult {
  date: string;
  weightKg?: number;
  waterMl?: number;
}

export class IngestError extends Error {
  constructor(public field: string, message: string) {
    super(message);
  }
}

function blank(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

/**
 * Skriver in vikt och vatten för en dag. Idempotent: samma anrop två gånger ger samma
 * tillstånd. Vikt ersätter dagens vägning; vatten blir det största av det som redan står
 * i Kraft och Hälsans dagssumma, så att en manuell loggning inte försvinner och inget
 * räknas dubbelt när genvägen körs flera gånger.
 */
export async function applyHealthSync(userId: string, timezone: string, input: IngestInput): Promise<IngestResult> {
  const today = todayInZone(timezone);
  const date = input.date ?? today;
  if (date > addDays(today, 1) || date < addDays(today, -30)) throw new IngestError("date", "datumet är utanför tillåtet intervall");

  const result: IngestResult = { date };

  if (!blank(input.weight)) {
    const q = parseQuantity(input.weight, input.weightUnit);
    const kg = q ? toKg(q) : null;
    if (kg === null) throw new IngestError("weight", "vikten kunde inte tolkas");
    if (kg < 20 || kg > 400) throw new IngestError("weight", "vikten måste vara mellan 20 och 400 kg");
    await logWeight(userId, date, kg);
    result.weightKg = Math.round(kg * 10) / 10;
  }

  if (!blank(input.water)) {
    const q = parseQuantity(input.water, input.waterUnit);
    const ml = q ? toMl(q) : null;
    if (ml === null) throw new IngestError("water", "vattnet kunde inte tolkas");
    if (ml < 0 || ml > 10_000) throw new IngestError("water", "vatten måste vara mellan 0 och 10 000 ml");
    result.waterMl = await setWaterAtLeast(userId, date, Math.round(ml));
  }

  return result;
}
