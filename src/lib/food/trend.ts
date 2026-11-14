import { addDays } from "@/lib/dates";
import type { WeightPoint } from "./queries";

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * Viktens 7-dagarssnitt och förändringen mot veckan innan. Enstaka vägningar svänger med vätska
 * och mat; snittet är det som går att lita på.
 */
export function weightTrend(points: WeightPoint[], today: string) {
  const inRange = (from: number, to: number) =>
    points.filter((p) => p.date >= addDays(today, from) && p.date <= addDays(today, to)).map((p) => p.weightKg);
  const now = avg(inRange(-6, 0));
  const before = avg(inRange(-13, -7));
  return {
    avg7: now,
    delta: now != null && before != null ? now - before : null,
    last: points.length ? points[points.length - 1].weightKg : null,
  };
}
