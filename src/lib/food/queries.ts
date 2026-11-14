/**
 * Serverfrågor för matdelen. Varje funktion tar `userId` och filtrerar på det (hård regel 3).
 * Makron kopieras in i `food_log` när posten skapas (hård regel 4): ändras ett livsmedel
 * senare ska historiken inte ändras. Datum är `YYYY-MM-DD` i användarens tidszon (regel 5).
 */
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/errors";
import { foodFavorites, foodLog, foods, sessions, userSettings, waterLog, weightLog } from "@/lib/db/schema";
import { addDays } from "@/lib/dates";
import { swedishFoodNamesMatching } from "@/lib/i18n/foods";
import { round2, scalePer100g } from "@/lib/nutrition";
import { effectiveTargets } from "./goals";
import { sumMacros, type DayDTO, type DiaryEntryDTO, type FoodDTO, type Meal, type WeekDayDTO } from "./types";
import type { DiaryCreate, FoodInput } from "./validate";

const num = (v: string | null | undefined): number | null => (v == null ? null : Number(v));
const visibleTo = (userId: string) => or(isNull(foods.userId), eq(foods.userId, userId));

function toFood(row: typeof foods.$inferSelect, favorite = false): FoodDTO {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    barcode: row.barcode,
    kcal100g: Number(row.kcal100g),
    protein100g: Number(row.protein100g),
    carbs100g: Number(row.carbs100g),
    fat100g: Number(row.fat100g),
    fiber100g: num(row.fiber100g),
    sugar100g: num(row.sugar100g),
    salt100g: num(row.salt100g),
    servingGrams: num(row.servingGrams),
    servingLabel: row.servingLabel,
    own: row.userId !== null,
    favorite,
  };
}

async function favoriteIds(userId: string): Promise<Set<string>> {
  const rows = await getDb().select({ id: foodFavorites.foodId }).from(foodFavorites).where(eq(foodFavorites.userId, userId));
  return new Set(rows.map((r) => r.id));
}

// ------------------------------------------------------------------ livsmedel

/** Sök på namn eller märke, på svenska eller engelska. Egna livsmedel visas före de delade. */
export async function searchFoods(userId: string, q: string, limit = 30): Promise<FoodDTO[]> {
  const query = q.trim();
  if (!query) return [];
  const escaped = query.replace(/[\\%_]/g, (c) => `\\${c}`);
  const matched = swedishFoodNamesMatching(query);
  const [rows, favs] = await Promise.all([
    getDb()
      .select()
      .from(foods)
      .where(
        and(
          visibleTo(userId),
          or(
            ilike(foods.name, `%${escaped}%`),
            ilike(foods.brand, `%${escaped}%`),
            matched.length ? inArray(foods.name, matched) : undefined,
          ),
        ),
      )
      .orderBy(sql`(case when ${foods.userId} is null then 1 else 0 end)`, asc(foods.name))
      .limit(Math.min(limit, 60)),
    favoriteIds(userId),
  ]);
  return rows.map((r) => toFood(r, favs.has(r.id)));
}

/** Senast loggade livsmedel, nyast först. */
export async function recentFoods(userId: string, limit = 12): Promise<FoodDTO[]> {
  const last = sql<Date>`max(${foodLog.createdAt})`;
  const [rows, favs] = await Promise.all([
    getDb()
      .select({ food: foods })
      .from(foodLog)
      .innerJoin(foods, eq(foods.id, foodLog.foodId))
      .where(and(eq(foodLog.userId, userId), visibleTo(userId)))
      .groupBy(foods.id)
      .orderBy(desc(last))
      .limit(limit),
    favoriteIds(userId),
  ]);
  return rows.map((r) => toFood(r.food, favs.has(r.food.id)));
}

export async function favoriteFoods(userId: string): Promise<FoodDTO[]> {
  const rows = await getDb()
    .select({ food: foods })
    .from(foodFavorites)
    .innerJoin(foods, eq(foods.id, foodFavorites.foodId))
    .where(and(eq(foodFavorites.userId, userId), visibleTo(userId)))
    .orderBy(asc(foods.name));
  return rows.map((r) => toFood(r.food, true));
}

export async function getFood(userId: string, id: string): Promise<FoodDTO | null> {
  const [row] = await getDb()
    .select()
    .from(foods)
    .where(and(eq(foods.id, id), visibleTo(userId)))
    .limit(1);
  if (!row) return null;
  return toFood(row, (await favoriteIds(userId)).has(row.id));
}

export async function setFavorite(userId: string, foodId: string, on: boolean): Promise<boolean> {
  const db = getDb();
  const [food] = await db
    .select({ id: foods.id })
    .from(foods)
    .where(and(eq(foods.id, foodId), visibleTo(userId)))
    .limit(1);
  if (!food) return false;
  if (on) await db.insert(foodFavorites).values({ userId, foodId }).onConflictDoNothing();
  else await db.delete(foodFavorites).where(and(eq(foodFavorites.userId, userId), eq(foodFavorites.foodId, foodId)));
  return true;
}

const foodValues = (input: FoodInput) => ({
  name: input.name,
  brand: input.brand || null,
  barcode: input.barcode || null,
  kcal100g: String(input.kcal100g),
  protein100g: String(input.protein100g),
  carbs100g: String(input.carbs100g),
  fat100g: String(input.fat100g),
  fiber100g: input.fiber100g != null ? String(input.fiber100g) : null,
  sugar100g: input.sugar100g != null ? String(input.sugar100g) : null,
  salt100g: input.salt100g != null ? String(input.salt100g) : null,
  servingGrams: input.servingGrams != null ? String(input.servingGrams) : null,
  servingLabel: input.servingLabel || null,
});

export async function createFood(
  userId: string,
  input: FoodInput,
): Promise<{ ok: true; food: FoodDTO } | { ok: false; error: "barcode_taken" }> {
  try {
    const [row] = await getDb()
      .insert(foods)
      .values({ ...foodValues(input), userId, source: "manual" })
      .returning();
    return { ok: true, food: toFood(row) };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: "barcode_taken" };
    throw err;
  }
}

/** Bara egna livsmedel går att ändra. Gamla loggrader har egna frysta värden och påverkas inte. */
export async function updateFood(
  userId: string,
  id: string,
  input: FoodInput,
): Promise<{ ok: true; food: FoodDTO } | { ok: false; error: "not_found" | "barcode_taken" }> {
  try {
    const [row] = await getDb()
      .update(foods)
      .set(foodValues(input))
      .where(and(eq(foods.id, id), eq(foods.userId, userId)))
      .returning();
    if (!row) return { ok: false, error: "not_found" };
    return { ok: true, food: toFood(row, (await favoriteIds(userId)).has(row.id)) };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: "barcode_taken" };
    throw err;
  }
}

export async function deleteFood(userId: string, id: string): Promise<boolean> {
  const gone = await getDb()
    .delete(foods)
    .where(and(eq(foods.id, id), eq(foods.userId, userId)))
    .returning({ id: foods.id });
  return gone.length > 0;
}

// ------------------------------------------------------------------- dagbok

function toEntry(row: typeof foodLog.$inferSelect): DiaryEntryDTO {
  return {
    id: row.id,
    clientId: row.clientId,
    meal: row.meal as Meal,
    foodId: row.foodId,
    name: row.name,
    grams: Number(row.grams),
    servings: Number(row.servings),
    kcal: Number(row.kcal),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
  };
}

export async function getDay(
  userId: string,
  date: string,
  settings: typeof userSettings.$inferSelect,
): Promise<DayDTO> {
  const db = getDb();
  const [entries, [water], [weight]] = await Promise.all([
    db
      .select()
      .from(foodLog)
      .where(and(eq(foodLog.userId, userId), eq(foodLog.loggedOn, date)))
      .orderBy(asc(foodLog.createdAt)),
    db
      .select({ ml: waterLog.ml })
      .from(waterLog)
      .where(and(eq(waterLog.userId, userId), eq(waterLog.loggedOn, date)))
      .limit(1),
    db
      .select({ kg: weightLog.weightKg })
      .from(weightLog)
      .where(and(eq(weightLog.userId, userId), eq(weightLog.loggedOn, date)))
      .limit(1),
  ]);
  const dto = entries.map(toEntry);
  return {
    date,
    entries: dto,
    totals: sumMacros(dto),
    targets: effectiveTargets(settings),
    waterMl: water?.ml ?? 0,
    waterTargetMl: settings.waterTargetMl,
    weightKg: weight ? Number(weight.kg) : null,
  };
}

type AddResult =
  | { ok: true; entry: DiaryEntryDTO }
  | { ok: false; error: "food_not_found" | "no_serving" | "conflict" };

/** Idempotent på `clientId`: samma post två gånger blir en rad. */
export async function addEntry(userId: string, input: DiaryCreate): Promise<AddResult> {
  const db = getDb();
  let values: Pick<typeof foodLog.$inferInsert, "foodId" | "name" | "grams" | "servings" | "kcal" | "protein" | "carbs" | "fat">;

  if (input.quick) {
    const q = input.quick;
    values = {
      foodId: null,
      name: q.name,
      grams: "0",
      servings: "1",
      kcal: String(round2(q.kcal)),
      protein: String(round2(q.protein)),
      carbs: String(round2(q.carbs)),
      fat: String(round2(q.fat)),
    };
  } else {
    const [food] = await db
      .select()
      .from(foods)
      .where(and(eq(foods.id, input.foodId!), visibleTo(userId)))
      .limit(1);
    if (!food) return { ok: false, error: "food_not_found" };
    const serving = num(food.servingGrams);
    let grams: number;
    let servings: number;
    if (input.servings != null) {
      if (!serving) return { ok: false, error: "no_serving" };
      servings = input.servings;
      grams = round2(servings * serving);
    } else {
      grams = input.grams!;
      servings = serving ? round2(grams / serving) : 1;
    }
    const m = scalePer100g(
      {
        kcal: Number(food.kcal100g),
        protein: Number(food.protein100g),
        carbs: Number(food.carbs100g),
        fat: Number(food.fat100g),
      },
      grams,
    );
    values = {
      foodId: food.id,
      name: food.name,
      grams: String(grams),
      servings: String(servings),
      kcal: String(m.kcal),
      protein: String(m.protein),
      carbs: String(m.carbs),
      fat: String(m.fat),
    };
  }

  const inserted = await db
    .insert(foodLog)
    .values({ ...values, userId, loggedOn: input.date, meal: input.meal, clientId: input.clientId })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return { ok: true, entry: toEntry(inserted[0]) };

  const [dup] = await db.select().from(foodLog).where(eq(foodLog.clientId, input.clientId)).limit(1);
  if (dup && dup.userId === userId) return { ok: true, entry: toEntry(dup) };
  return { ok: false, error: "conflict" };
}

/**
 * Ändrar mängd (skalar alla fyra värden från radens egna, frysta värden) och/eller måltid.
 * Snabbloggade rader har ingen mängd och kan bara byta måltid.
 */
export async function updateEntry(
  userId: string,
  id: string,
  patch: { grams?: number; meal?: Meal },
): Promise<{ ok: true; entry: DiaryEntryDTO } | { ok: false; error: "not_found" | "not_portionable" }> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(foodLog)
    .where(and(eq(foodLog.id, id), eq(foodLog.userId, userId)))
    .limit(1);
  if (!row) return { ok: false, error: "not_found" };

  const set: Partial<typeof foodLog.$inferInsert> = {};
  if (patch.meal) set.meal = patch.meal;
  if (patch.grams != null) {
    const old = Number(row.grams);
    if (old <= 0) return { ok: false, error: "not_portionable" };
    const f = patch.grams / old;
    set.grams = String(round2(patch.grams));
    set.kcal = String(round2(Number(row.kcal) * f));
    set.protein = String(round2(Number(row.protein) * f));
    set.carbs = String(round2(Number(row.carbs) * f));
    set.fat = String(round2(Number(row.fat) * f));
    const oldServings = Number(row.servings);
    set.servings = String(round2(oldServings * f));
  }
  if (Object.keys(set).length === 0) return { ok: true, entry: toEntry(row) };
  const [updated] = await db.update(foodLog).set(set).where(eq(foodLog.id, id)).returning();
  return { ok: true, entry: toEntry(updated) };
}

export async function deleteEntry(userId: string, id: string): Promise<boolean> {
  const gone = await getDb()
    .delete(foodLog)
    .where(and(eq(foodLog.id, id), eq(foodLog.userId, userId)))
    .returning({ id: foodLog.id });
  return gone.length > 0;
}

// ----------------------------------------------------------- vatten och vikt

/** Lägger till (eller drar ifrån) vatten för en dag. Håller sig mellan 0 och 10 000 ml. */
export async function addWater(userId: string, date: string, deltaMl: number): Promise<number> {
  const [row] = await getDb()
    .insert(waterLog)
    .values({ userId, loggedOn: date, ml: Math.max(0, Math.min(10_000, deltaMl)) })
    .onConflictDoUpdate({
      target: [waterLog.userId, waterLog.loggedOn],
      set: {
        ml: sql`greatest(0, least(10000, ${waterLog.ml} + ${deltaMl}))`,
        updatedAt: new Date(),
      },
    })
    .returning({ ml: waterLog.ml });
  return row.ml;
}

/** Håller `user_settings.weight_kg` i takt med senaste vägningen, eftersom målen räknas ur den. */
async function syncSettingsWeight(userId: string): Promise<void> {
  const db = getDb();
  const [latest] = await db
    .select({ kg: weightLog.weightKg })
    .from(weightLog)
    .where(eq(weightLog.userId, userId))
    .orderBy(desc(weightLog.loggedOn))
    .limit(1);
  if (latest) {
    await db.update(userSettings).set({ weightKg: latest.kg, updatedAt: new Date() }).where(eq(userSettings.userId, userId));
  }
}

export async function logWeight(userId: string, date: string, weightKg: number): Promise<void> {
  await getDb()
    .insert(weightLog)
    .values({ userId, loggedOn: date, weightKg: String(Math.round(weightKg * 10) / 10) })
    .onConflictDoUpdate({
      target: [weightLog.userId, weightLog.loggedOn],
      set: { weightKg: String(Math.round(weightKg * 10) / 10) },
    });
  await syncSettingsWeight(userId);
}

export async function deleteWeight(userId: string, date: string): Promise<boolean> {
  const gone = await getDb()
    .delete(weightLog)
    .where(and(eq(weightLog.userId, userId), eq(weightLog.loggedOn, date)))
    .returning({ id: weightLog.id });
  if (gone.length) await syncSettingsWeight(userId);
  return gone.length > 0;
}

export interface WeightPoint {
  date: string;
  weightKg: number;
}

/** Vägningar de senaste `days` dagarna, äldst först. */
export async function weightHistory(userId: string, today: string, days = 90): Promise<WeightPoint[]> {
  const rows = await getDb()
    .select({ date: weightLog.loggedOn, kg: weightLog.weightKg })
    .from(weightLog)
    .where(and(eq(weightLog.userId, userId), gte(weightLog.loggedOn, addDays(today, -days))))
    .orderBy(asc(weightLog.loggedOn));
  return rows.map((r) => ({ date: r.date, weightKg: Number(r.kg) }));
}

// -------------------------------------------------------------------- vecka

/** Sju dagar från `start`: ätet, vatten, vikt och antal avslutade pass per dag. */
export async function weekStats(userId: string, start: string, timeZone: string): Promise<WeekDayDTO[]> {
  const db = getDb();
  const end = addDays(start, 6);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const [food, water, weights, trained] = await Promise.all([
    db
      .select({
        date: foodLog.loggedOn,
        kcal: sql<string>`coalesce(sum(${foodLog.kcal}), 0)`,
        protein: sql<string>`coalesce(sum(${foodLog.protein}), 0)`,
        carbs: sql<string>`coalesce(sum(${foodLog.carbs}), 0)`,
        fat: sql<string>`coalesce(sum(${foodLog.fat}), 0)`,
      })
      .from(foodLog)
      .where(and(eq(foodLog.userId, userId), gte(foodLog.loggedOn, start), lte(foodLog.loggedOn, end)))
      .groupBy(foodLog.loggedOn),
    db
      .select({ date: waterLog.loggedOn, ml: waterLog.ml })
      .from(waterLog)
      .where(and(eq(waterLog.userId, userId), gte(waterLog.loggedOn, start), lte(waterLog.loggedOn, end))),
    db
      .select({ date: weightLog.loggedOn, kg: weightLog.weightKg })
      .from(weightLog)
      .where(and(eq(weightLog.userId, userId), gte(weightLog.loggedOn, start), lte(weightLog.loggedOn, end))),
    // Samma uttryck används i SELECT, WHERE och GROUP BY; parametern typas (`::text`) och
    // grupperingen sker på kolumnposition, annars ser Postgres uttrycken som olika.
    db
      .select({
        date: sql<string>`to_char(timezone(${timeZone}::text, ${sessions.startedAt}), 'YYYY-MM-DD')`,
        n: sql<string>`count(*)`,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.status, "done"),
          sql`to_char(timezone(${timeZone}::text, ${sessions.startedAt}), 'YYYY-MM-DD') between ${start} and ${end}`,
        ),
      )
      .groupBy(sql`1`),
  ]);

  return dates.map((date) => {
    const f = food.find((r) => r.date === date);
    return {
      date,
      kcal: f ? Math.round(Number(f.kcal)) : 0,
      protein: f ? Math.round(Number(f.protein)) : 0,
      carbs: f ? Math.round(Number(f.carbs)) : 0,
      fat: f ? Math.round(Number(f.fat)) : 0,
      waterMl: water.find((r) => r.date === date)?.ml ?? 0,
      weightKg: (() => {
        const w = weights.find((r) => r.date === date);
        return w ? Number(w.kg) : null;
      })(),
      workouts: Number(trained.find((r) => r.date === date)?.n ?? 0),
    };
  });
}
