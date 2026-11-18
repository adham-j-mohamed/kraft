/**
 * Datamodellen för Kraft.
 *
 * Principer:
 *  - All användardata hänger på `users.id` och filtreras alltid på inloggat konto.
 *  - `exercises` och `foods` med `user_id = null` är globala bibliotek (seed).
 *  - Makron och namn kopieras in i loggraderna när posten skapas, så att historiken
 *    inte ändras om en produkt eller övning byter namn eller värden senare.
 *  - `client_id` är en idempotensnyckel som telefonen skapar. Samma skrivning som
 *    skickas två gånger (offline-kö, dåligt nät) blir en rad.
 *  - Datum för dagbok (`logged_on`) är `date` i användarens tidszon, inte UTC-tid.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------- användare

export const users = pgTable(
  "users",
  {
    id: id(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordUpdatedAt: timestamp("password_updated_at", { withTimezone: true }),
    name: text("name"),
    role: text("role").notNull().default("member"), // member | admin
    /** pending = väntar på admins godkännande och kan inte logga in; approved = fullt konto. */
    status: text("status").notNull().default("approved"), // pending | approved
    /** Fritext från registreringen så att admin ser vem förfrågan kommer från. */
    signupNote: text("signup_note"),
    createdAt: createdAt(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_username_ux").on(t.username), index("users_status_ix").on(t.status)],
);

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  timezone: text("timezone").notNull().default("Europe/Stockholm"),
  units: text("units").notNull().default("metric"), // metric | imperial
  theme: text("theme").notNull().default("dark"), // dark | light | system

  kcalTarget: integer("kcal_target"),
  proteinTarget: integer("protein_target"),
  carbsTarget: integer("carbs_target"),
  fatTarget: integer("fat_target"),
  goalMode: text("goal_mode").notNull().default("auto"), // auto | manual
  goalRateKgWeek: numeric("goal_rate_kg_week", { precision: 3, scale: 2 })
    .notNull()
    .default("-0.25"),
  waterTargetMl: integer("water_target_ml").notNull().default(2000),

  weightKg: numeric("weight_kg", { precision: 5, scale: 1 }),
  heightCm: integer("height_cm"),
  birthYear: integer("birth_year"),
  sex: text("sex"), // male | female | other
  activityLevel: text("activity_level").notNull().default("moderate"),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ----------------------------------------------------------------- träning

/** tracking: weight_reps | reps_only | time | distance */
export const exercises = pgTable(
  "exercises",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    muscleGroup: text("muscle_group").notNull().default("annat"),
    equipment: text("equipment"),
    tracking: text("tracking").notNull().default("weight_reps"),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("exercises_user_name_ux")
      .on(t.userId, t.name)
      .where(sql`${t.userId} is not null`),
    uniqueIndex("exercises_global_name_ux")
      .on(t.name)
      .where(sql`${t.userId} is null`),
  ],
);

export const programs = pgTable(
  "programs",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    rotationIndex: integer("rotation_index").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("programs_user_ix").on(t.userId)],
);

export const programWorkouts = pgTable(
  "program_workouts",
  {
    id: id(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    notes: text("notes"),
  },
  (t) => [uniqueIndex("program_workouts_pos_ux").on(t.programId, t.position)],
);

export const workoutExercises = pgTable(
  "workout_exercises",
  {
    id: id(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => programWorkouts.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    targetSets: integer("target_sets").notNull().default(3),
    targetRepsLow: integer("target_reps_low"),
    targetRepsHigh: integer("target_reps_high"),
    targetSeconds: integer("target_seconds"),
    targetMeters: integer("target_meters"),
    restSeconds: integer("rest_seconds").notNull().default(90),
    /** Samma tal = superset. null = vanlig övning. */
    supersetGroup: integer("superset_group"),
    notes: text("notes"),
  },
  (t) => [uniqueIndex("workout_exercises_pos_ux").on(t.workoutId, t.position)],
);

/** status: active | done | abandoned */
export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    programId: uuid("program_id").references(() => programs.id, { onDelete: "set null" }),
    workoutId: uuid("workout_id").references(() => programWorkouts.id, {
      onDelete: "set null",
    }),
    workoutName: text("workout_name").notNull(),
    status: text("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    notes: text("notes"),
    clientId: uuid("client_id").notNull().defaultRandom(),
  },
  (t) => [
    uniqueIndex("sessions_client_ux").on(t.clientId),
    index("sessions_user_ix").on(t.userId, t.startedAt),
  ],
);

export const sessionExercises = pgTable(
  "session_exercises",
  {
    id: id(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    restSeconds: integer("rest_seconds").notNull().default(90),
    /** Frysta kopior från programmet när passet startade (hård regel 4). */
    exerciseName: text("exercise_name").notNull().default(""),
    tracking: text("tracking").notNull().default("weight_reps"),
    targetSets: integer("target_sets").notNull().default(3),
    targetRepsLow: integer("target_reps_low"),
    targetRepsHigh: integer("target_reps_high"),
    targetSeconds: integer("target_seconds"),
    targetMeters: integer("target_meters"),
    supersetGroup: integer("superset_group"),
  },
  (t) => [uniqueIndex("session_exercises_pos_ux").on(t.sessionId, t.position)],
);

/** set_type: normal | dropset | warmup */
export const sessionSets = pgTable(
  "session_sets",
  {
    id: id(),
    sessionExerciseId: uuid("session_exercise_id")
      .notNull()
      .references(() => sessionExercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    reps: integer("reps"),
    durationSec: integer("duration_sec"),
    distanceM: integer("distance_m"),
    rpe: numeric("rpe", { precision: 3, scale: 1 }),
    setType: text("set_type").notNull().default("normal"),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
    clientId: uuid("client_id").notNull().defaultRandom(),
  },
  (t) => [
    uniqueIndex("session_sets_client_ux").on(t.clientId),
    uniqueIndex("session_sets_pos_ux").on(t.sessionExerciseId, t.setNumber),
  ],
);

// --------------------------------------------------------------------- mat

/** source: seed | off | manual */
export const foods = pgTable(
  "foods",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    barcode: text("barcode"),
    name: text("name").notNull(),
    brand: text("brand"),
    kcal100g: numeric("kcal_100g", { precision: 7, scale: 2 }).notNull(),
    protein100g: numeric("protein_100g", { precision: 6, scale: 2 }).notNull().default("0"),
    carbs100g: numeric("carbs_100g", { precision: 6, scale: 2 }).notNull().default("0"),
    fat100g: numeric("fat_100g", { precision: 6, scale: 2 }).notNull().default("0"),
    fiber100g: numeric("fiber_100g", { precision: 6, scale: 2 }),
    sugar100g: numeric("sugar_100g", { precision: 6, scale: 2 }),
    salt100g: numeric("salt_100g", { precision: 6, scale: 3 }),
    /** 0 = räknas per 100 ml (dryck). */
    servingGrams: numeric("serving_grams", { precision: 7, scale: 2 }),
    servingLabel: text("serving_label"),
    imageUrl: text("image_url"),
    source: text("source").notNull().default("manual"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("foods_user_barcode_ux")
      .on(t.userId, t.barcode)
      .where(sql`${t.barcode} is not null and ${t.userId} is not null`),
    uniqueIndex("foods_global_barcode_ux")
      .on(t.barcode)
      .where(sql`${t.barcode} is not null and ${t.userId} is null`),
    index("foods_name_ix").on(t.name),
  ],
);

export const foodLog = pgTable(
  "food_log",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    loggedOn: date("logged_on", { mode: "string" }).notNull(),
    meal: text("meal").notNull().default("lunch"), // breakfast | lunch | dinner | snack
    foodId: uuid("food_id").references(() => foods.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    grams: numeric("grams", { precision: 8, scale: 2 }).notNull().default("0"),
    servings: numeric("servings", { precision: 6, scale: 2 }).notNull().default("1"),
    kcal: numeric("kcal", { precision: 8, scale: 2 }).notNull(),
    protein: numeric("protein", { precision: 7, scale: 2 }).notNull().default("0"),
    carbs: numeric("carbs", { precision: 7, scale: 2 }).notNull().default("0"),
    fat: numeric("fat", { precision: 7, scale: 2 }).notNull().default("0"),
    createdAt: createdAt(),
    clientId: uuid("client_id").notNull().defaultRandom(),
  },
  (t) => [
    uniqueIndex("food_log_client_ux").on(t.clientId),
    index("food_log_user_day_ix").on(t.userId, t.loggedOn),
  ],
);

export const foodFavorites = pgTable(
  "food_favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("food_favorites_ux").on(t.userId, t.foodId)],
);

export const mealTemplates = pgTable(
  "meal_templates",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("meal_templates_user_name_ux").on(t.userId, t.name)],
);

export const mealTemplateItems = pgTable("meal_template_items", {
  id: id(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => mealTemplates.id, { onDelete: "cascade" }),
  foodId: uuid("food_id")
    .notNull()
    .references(() => foods.id, { onDelete: "cascade" }),
  grams: numeric("grams", { precision: 8, scale: 2 }).notNull(),
  servings: numeric("servings", { precision: 6, scale: 2 }).notNull().default("1"),
});

export const weightLog = pgTable(
  "weight_log",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    loggedOn: date("logged_on", { mode: "string" }).notNull(),
    weightKg: numeric("weight_kg", { precision: 5, scale: 1 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("weight_log_day_ux").on(t.userId, t.loggedOn)],
);

export const waterLog = pgTable(
  "water_log",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    loggedOn: date("logged_on", { mode: "string" }).notNull(),
    ml: integer("ml").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("water_log_day_ux").on(t.userId, t.loggedOn)],
);

// ------------------------------------------------------------- hälsosynk

/**
 * Nyckel för Genvägar-appen (Shortcuts) på iPhone, som skickar vikt och vatten från Hälsa.
 * Bara SHA-256 av nyckeln lagras; klartexten visas en gång när den skapas. Ett konto har
 * högst en nyckel — att skapa en ny ersätter den gamla.
 */
export const apiTokens = pgTable(
  "api_tokens",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    /** Vad senaste synken gjorde, t.ex. "vikt 82,3 kg · vatten 1 250 ml". */
    lastSummary: text("last_summary"),
  },
  (t) => [uniqueIndex("api_tokens_hash_ux").on(t.tokenHash), uniqueIndex("api_tokens_user_ux").on(t.userId)],
);
