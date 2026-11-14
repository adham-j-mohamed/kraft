/** Typer för matdelen. Klientsäkra: inga serverberoenden. */
export const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type Meal = (typeof MEALS)[number];

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodDTO {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  kcal100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  fiber100g: number | null;
  sugar100g: number | null;
  salt100g: number | null;
  servingGrams: number | null;
  servingLabel: string | null;
  /** true = eget livsmedel för kontot, false = delat bibliotek. */
  own: boolean;
  favorite: boolean;
}

export interface DiaryEntryDTO extends Macros {
  id: string;
  clientId: string;
  meal: Meal;
  foodId: string | null;
  name: string;
  grams: number;
  servings: number;
}

export interface DayDTO {
  date: string;
  entries: DiaryEntryDTO[];
  totals: Macros;
  /** Null när inget mål går att räkna ut eller är satt. */
  targets: Macros | null;
  waterMl: number;
  waterTargetMl: number;
  weightKg: number | null;
}

export interface WeekDayDTO extends Macros {
  date: string;
  waterMl: number;
  weightKg: number | null;
  workouts: number;
}

export function sumMacros(items: Macros[]): Macros {
  const total = items.reduce(
    (a, e) => ({ kcal: a.kcal + e.kcal, protein: a.protein + e.protein, carbs: a.carbs + e.carbs, fat: a.fat + e.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const r = (n: number) => Math.round(n * 10) / 10;
  return { kcal: Math.round(total.kcal), protein: r(total.protein), carbs: r(total.carbs), fat: r(total.fat) };
}
