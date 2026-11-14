/**
 * Mål för kalorier och makron. I auto-läge räknas de live ur längd, vikt, ålder, kön och
 * aktivitetsnivå (Mifflin-St Jeor), så en ny vikt slår igenom direkt. I manuellt läge gäller
 * de siffror användaren skrivit in. Allt är riktvärden, inte medicinsk rådgivning.
 */
import type { userSettings } from "@/lib/db/schema";
import { bmrMifflin, macroTargets, targetKcal, tdee, type ActivityLevel, type MacroTargets, type Sex } from "@/lib/nutrition";

/** Golv så att en aggressiv takt aldrig räknar fram ett orimligt lågt mål. */
export const MIN_KCAL = 1200;

type Settings = typeof userSettings.$inferSelect;
type AutoInput = Pick<Settings, "weightKg" | "heightCm" | "birthYear" | "sex" | "activityLevel" | "goalRateKgWeek">;

export function autoTargets(s: AutoInput, year = new Date().getFullYear()): MacroTargets | null {
  const weight = s.weightKg != null ? Number(s.weightKg) : null;
  if (!weight || !s.heightCm || !s.birthYear || !s.sex) return null;
  const age = year - s.birthYear;
  if (age < 10 || age > 110) return null;
  const bmr = bmrMifflin({ weightKg: weight, heightCm: s.heightCm, age, sex: s.sex as Sex });
  const kcal = Math.max(MIN_KCAL, targetKcal(tdee(bmr, s.activityLevel as ActivityLevel), Number(s.goalRateKgWeek)));
  return macroTargets(kcal, weight);
}

export function effectiveTargets(s: Settings): MacroTargets | null {
  if (s.goalMode === "manual") {
    if (!s.kcalTarget) return null;
    return { kcal: s.kcalTarget, protein: s.proteinTarget ?? 0, carbs: s.carbsTarget ?? 0, fat: s.fatTarget ?? 0 };
  }
  return autoTargets(s);
}
