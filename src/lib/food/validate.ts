import { z } from "zod";

const num = (min: number, max: number) => z.number().min(min).max(max);
const optNum = (min: number, max: number) => num(min, max).nullable().optional();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const foodInput = z.object({
  name: z.string().trim().min(1).max(100),
  brand: z.string().trim().max(60).nullable().optional(),
  barcode: z
    .string()
    .trim()
    .regex(/^\d{6,14}$/)
    .nullable()
    .optional(),
  kcal100g: num(0, 1000),
  protein100g: num(0, 100).default(0),
  carbs100g: num(0, 100).default(0),
  fat100g: num(0, 100).default(0),
  fiber100g: optNum(0, 100),
  sugar100g: optNum(0, 100),
  salt100g: optNum(0, 100),
  servingGrams: optNum(1, 5000),
  servingLabel: z.string().trim().max(40).nullable().optional(),
});
export type FoodInput = z.infer<typeof foodInput>;

export const diaryCreate = z
  .object({
    date,
    meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
    clientId: z.uuid(),
    foodId: z.uuid().optional(),
    grams: num(0.1, 5000).optional(),
    servings: num(0.05, 100).optional(),
    quick: z
      .object({
        name: z.string().trim().min(1).max(100),
        kcal: num(0, 10000),
        protein: num(0, 1000).default(0),
        carbs: num(0, 1000).default(0),
        fat: num(0, 1000).default(0),
      })
      .optional(),
  })
  .refine((v) => (v.quick ? !v.foodId : !!v.foodId && (v.grams != null || v.servings != null)), {
    message: "ange antingen foodId med mängd, eller quick",
  });
export type DiaryCreate = z.infer<typeof diaryCreate>;

export const diaryPatch = z.object({
  grams: num(0.1, 5000).optional(),
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
});

export const weightInput = z.object({ date, weightKg: num(20, 400) });
export const waterInput = z.object({ date, deltaMl: z.number().int().min(-5000).max(5000) });
export const favoriteInput = z.object({ on: z.boolean() });
