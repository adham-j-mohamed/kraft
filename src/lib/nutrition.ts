/**
 * Energi- och makroberäkning. Mifflin-St Jeor för BMR, standardfaktorer för
 * aktivitetsnivå, och ett underskott/överskott härlett ur veckotakt i kg.
 * 1 kg kroppsfett ≈ 7 700 kcal.
 */
export type Sex = "male" | "female" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "high" | "athlete";

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  athlete: 1.9,
};

export function bmrMifflin(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  if (input.sex === "male") return base + 5;
  if (input.sex === "female") return base - 161;
  return base - 78; // medelvärde mellan man och kvinna
}

export function tdee(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_FACTOR[activity];
}

/** Målviktstakt i kg/vecka (negativt = gå ner). Returnerar kcal per dag. */
export function targetKcal(tdeeKcal: number, rateKgWeek: number): number {
  return Math.round(tdeeKcal + (rateKgWeek * 7700) / 7);
}

export interface MacroTargets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Protein 1,8 g/kg kroppsvikt, fett 25 % av energin, resten kolhydrater.
 * Golv: fett minst 0,6 g/kg.
 */
export function macroTargets(kcal: number, weightKg: number): MacroTargets {
  const protein = Math.round(weightKg * 1.8);
  const fat = Math.max(Math.round(weightKg * 0.6), Math.round((kcal * 0.25) / 9));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

/** Kalorier ur makron, för kontroll och visning. */
export function kcalFromMacros(protein: number, carbs: number, fat: number): number {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

/** Skala ett livsmedels värden per 100 g till en portion i gram. */
export function scalePer100g(
  per100g: { kcal: number; protein: number; carbs: number; fat: number },
  grams: number,
) {
  const f = grams / 100;
  return {
    kcal: round2(per100g.kcal * f),
    protein: round2(per100g.protein * f),
    carbs: round2(per100g.carbs * f),
    fat: round2(per100g.fat * f),
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Uppskattat 1RM (Epley). Vikten ska vara arbetsvikten, reps antalet. */
export function e1rm(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/** Volym för ett set: vikt × reps. Kroppsvikt räknas utan vikt. */
export function setVolume(weightKg: number | null, reps: number | null): number {
  return (weightKg ?? 0) * (reps ?? 0);
}
