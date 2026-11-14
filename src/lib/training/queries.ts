/**
 * Serverfrågor för träningsdelen. Varje funktion tar `userId` och filtrerar på det
 * (hård regel 3): en rad som tillhör ett annat konto ska se ut som om den inte finns.
 */
import { and, asc, desc, eq, ilike, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { swedishNamesMatching } from "@/lib/i18n/exercises";
import { intlTag, type Locale } from "@/lib/i18n/locales";
import { getDb } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/errors";
import {
  exercises,
  programs,
  programWorkouts,
  sessionExercises,
  sessionSets,
  sessions,
  workoutExercises,
} from "@/lib/db/schema";
import {
  bestOf,
  bestScore,
  type BestDTO,
  type ExerciseRef,
  type PrevPerformance,
  type ProgramDTO,
  type SessionDTO,
  type SetDTO,
  type SetType,
  type Tracking,
  type WorkoutDTO,
} from "./types";
import type { ProgramInput } from "./validate";

const num = (v: string | null | undefined): number | null => (v == null ? null : Number(v));
const str = (v: number | null | undefined): string | null => (v == null ? null : String(v));

function toSet(row: typeof sessionSets.$inferSelect): SetDTO {
  return {
    id: row.id,
    clientId: row.clientId,
    setNumber: row.setNumber,
    weightKg: num(row.weightKg),
    reps: row.reps,
    durationSec: row.durationSec,
    distanceM: row.distanceM,
    rpe: num(row.rpe),
    setType: row.setType as SetType,
    completedAt: row.completedAt.toISOString(),
  };
}

/** Tidszon och språk för datumetiketter som byggs på servern. */
export interface DateCtx {
  timeZone: string;
  locale: Locale;
}

function dateLabel(date: Date, ctx: DateCtx): string {
  return new Intl.DateTimeFormat(intlTag(ctx.locale), {
    day: "numeric",
    month: "short",
    timeZone: ctx.timeZone,
  }).format(date);
}

const visibleTo = (userId: string) => or(isNull(exercises.userId), eq(exercises.userId, userId));

// ------------------------------------------------------------------ övningar

function toRef(row: typeof exercises.$inferSelect): ExerciseRef {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscleGroup,
    equipment: row.equipment,
    tracking: row.tracking as Tracking,
    own: row.userId !== null,
  };
}

export async function listExercises(userId: string, opts: { q?: string; limit?: number } = {}) {
  const db = getDb();
  const q = opts.q?.trim();
  const escaped = q?.replace(/[\\%_]/g, (c) => `\\${c}`);
  // Engelska sökord ska också hitta de svenska namnen i databasen.
  const matched = q ? swedishNamesMatching(q) : [];
  const rows = await db
    .select()
    .from(exercises)
    .where(
      and(
        visibleTo(userId),
        escaped
          ? or(ilike(exercises.name, `%${escaped}%`), matched.length ? inArray(exercises.name, matched) : undefined)
          : undefined,
      ),
    )
    .orderBy(asc(exercises.muscleGroup), asc(exercises.name))
    .limit(Math.min(opts.limit ?? 60, 200));
  return rows.map(toRef);
}

export async function getExercise(userId: string, id: string): Promise<ExerciseRef | null> {
  const [row] = await getDb()
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, id), visibleTo(userId)))
    .limit(1);
  return row ? toRef(row) : null;
}

export async function createExercise(
  userId: string,
  input: { name: string; muscleGroup: string; equipment?: string | null; tracking: Tracking },
): Promise<{ ok: true; exercise: ExerciseRef } | { ok: false; error: "name_taken" }> {
  try {
    const [row] = await getDb()
      .insert(exercises)
      .values({
        userId,
        name: input.name,
        muscleGroup: input.muscleGroup,
        equipment: input.equipment || null,
        tracking: input.tracking,
      })
      .returning();
    return { ok: true, exercise: toRef(row) };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: "name_taken" };
    throw err;
  }
}

// ------------------------------------------------------------------- program

async function loadProgram(program: typeof programs.$inferSelect): Promise<ProgramDTO> {
  const db = getDb();
  const workouts = await db
    .select()
    .from(programWorkouts)
    .where(eq(programWorkouts.programId, program.id))
    .orderBy(asc(programWorkouts.position));
  const ids = workouts.map((w) => w.id);
  const rows = ids.length
    ? await db
        .select({ we: workoutExercises, ex: exercises })
        .from(workoutExercises)
        .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
        .where(inArray(workoutExercises.workoutId, ids))
        .orderBy(asc(workoutExercises.position))
    : [];

  const byWorkout = new Map<string, WorkoutDTO["exercises"]>();
  for (const { we, ex } of rows) {
    const list = byWorkout.get(we.workoutId) ?? [];
    list.push({
      exerciseId: ex.id,
      name: ex.name,
      tracking: ex.tracking as Tracking,
      muscleGroup: ex.muscleGroup,
      targetSets: we.targetSets,
      targetRepsLow: we.targetRepsLow,
      targetRepsHigh: we.targetRepsHigh,
      targetSeconds: we.targetSeconds,
      targetMeters: we.targetMeters,
      restSeconds: we.restSeconds,
      supersetGroup: we.supersetGroup,
      notes: we.notes,
    });
    byWorkout.set(we.workoutId, list);
  }

  return {
    id: program.id,
    name: program.name,
    rotationIndex: program.rotationIndex,
    workouts: workouts.map((w) => ({
      id: w.id,
      position: w.position,
      name: w.name,
      notes: w.notes,
      exercises: byWorkout.get(w.id) ?? [],
    })),
  };
}

export async function getActiveProgram(userId: string): Promise<ProgramDTO | null> {
  const [row] = await getDb()
    .select()
    .from(programs)
    .where(and(eq(programs.userId, userId), eq(programs.isActive, true)))
    .orderBy(desc(programs.createdAt))
    .limit(1);
  return row ? loadProgram(row) : null;
}

export async function getProgram(userId: string, id: string): Promise<ProgramDTO | null> {
  const [row] = await getDb()
    .select()
    .from(programs)
    .where(and(eq(programs.id, id), eq(programs.userId, userId)))
    .limit(1);
  return row ? loadProgram(row) : null;
}

/** Pass som står på tur: det vars position är `rotationIndex`, annars det första. */
export function nextWorkoutOf(program: ProgramDTO): WorkoutDTO | null {
  return program.workouts.find((w) => w.position === program.rotationIndex) ?? program.workouts[0] ?? null;
}

type SaveResult = { ok: true; id: string } | { ok: false; error: "unknown_exercise" | "not_found" };

/**
 * Skapar ett program, eller ersätter ett helt (`programId`). Passen byggs om från
 * grunden i en transaktion; pågående och gamla pass påverkas inte eftersom de bär
 * egna frysta kopior av övningarna.
 */
export async function saveProgram(userId: string, input: ProgramInput, programId?: string): Promise<SaveResult> {
  const db = getDb();

  // Ägarkontrollen först: någon annans program ska bete sig som om det inte finns,
  // oavsett vad resten av indatat innehåller.
  if (programId) {
    const [own] = await db
      .select({ id: programs.id })
      .from(programs)
      .where(and(eq(programs.id, programId), eq(programs.userId, userId)))
      .limit(1);
    if (!own) return { ok: false, error: "not_found" };
  }

  const wanted = [...new Set(input.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId)))];
  if (wanted.length) {
    const found = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(and(inArray(exercises.id, wanted), visibleTo(userId)));
    if (found.length !== wanted.length) return { ok: false, error: "unknown_exercise" };
  }

  return db.transaction(async (tx): Promise<SaveResult> => {
    let pid: string;
    if (programId) {
      const [own] = await tx
        .select({ id: programs.id, rotationIndex: programs.rotationIndex })
        .from(programs)
        .where(and(eq(programs.id, programId), eq(programs.userId, userId)))
        .limit(1);
      if (!own) return { ok: false, error: "not_found" };
      pid = own.id;
      await tx
        .update(programs)
        .set({ name: input.name, rotationIndex: own.rotationIndex % input.workouts.length })
        .where(eq(programs.id, pid));
      await tx.delete(programWorkouts).where(eq(programWorkouts.programId, pid));
    } else {
      await tx.update(programs).set({ isActive: false }).where(eq(programs.userId, userId));
      const [created] = await tx
        .insert(programs)
        .values({ userId, name: input.name })
        .returning({ id: programs.id });
      pid = created.id;
    }

    for (const [position, w] of input.workouts.entries()) {
      const [workout] = await tx
        .insert(programWorkouts)
        .values({ programId: pid, position, name: w.name, notes: w.notes || null })
        .returning({ id: programWorkouts.id });
      if (w.exercises.length) {
        await tx.insert(workoutExercises).values(
          w.exercises.map((e, i) => ({
            workoutId: workout.id,
            exerciseId: e.exerciseId,
            position: i,
            targetSets: e.targetSets,
            targetRepsLow: e.targetRepsLow ?? null,
            targetRepsHigh: e.targetRepsHigh ?? null,
            targetSeconds: e.targetSeconds ?? null,
            targetMeters: e.targetMeters ?? null,
            restSeconds: e.restSeconds,
            supersetGroup: e.supersetGroup ?? null,
            notes: e.notes || null,
          })),
        );
      }
    }
    return { ok: true, id: pid };
  });
}

export async function deleteProgram(userId: string, id: string): Promise<boolean> {
  const deleted = await getDb()
    .delete(programs)
    .where(and(eq(programs.id, id), eq(programs.userId, userId)))
    .returning({ id: programs.id });
  return deleted.length > 0;
}

// ---------------------------------------------------------------------- pass

export async function getActiveSession(userId: string) {
  const [row] = await getDb()
    .select({ id: sessions.id, workoutName: sessions.workoutName, startedAt: sessions.startedAt })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.status, "active")))
    .orderBy(desc(sessions.startedAt))
    .limit(1);
  return row ?? null;
}

type StartResult =
  | { ok: true; id: string; existing: boolean }
  | { ok: false; error: "not_found" | "empty_workout" | "conflict" }
  | { ok: false; error: "active_session"; sessionId: string };

/**
 * Startar ett pass och fryser passets övningar (namn, mål, vila, superset) i
 * `session_exercises`. Samma `clientId` två gånger ger samma pass.
 */
export async function startSession(userId: string, workoutId: string, clientId?: string): Promise<StartResult> {
  const db = getDb();

  if (clientId) {
    const [existing] = await db
      .select({ id: sessions.id, userId: sessions.userId })
      .from(sessions)
      .where(eq(sessions.clientId, clientId))
      .limit(1);
    if (existing) {
      return existing.userId === userId
        ? { ok: true, id: existing.id, existing: true }
        : { ok: false, error: "conflict" };
    }
  }

  const active = await getActiveSession(userId);
  if (active) return { ok: false, error: "active_session", sessionId: active.id };

  const [workout] = await db
    .select({ id: programWorkouts.id, name: programWorkouts.name, programId: programs.id })
    .from(programWorkouts)
    .innerJoin(programs, eq(programs.id, programWorkouts.programId))
    .where(and(eq(programWorkouts.id, workoutId), eq(programs.userId, userId)))
    .limit(1);
  if (!workout) return { ok: false, error: "not_found" };

  const items = await db
    .select({ we: workoutExercises, ex: exercises })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(eq(workoutExercises.workoutId, workout.id))
    .orderBy(asc(workoutExercises.position));
  if (items.length === 0) return { ok: false, error: "empty_workout" };

  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(sessions)
      .values({
        userId,
        programId: workout.programId,
        workoutId: workout.id,
        workoutName: workout.name,
        ...(clientId ? { clientId } : {}),
      })
      .returning({ id: sessions.id });
    await tx.insert(sessionExercises).values(
      items.map(({ we, ex }, i) => ({
        sessionId: created.id,
        exerciseId: ex.id,
        position: i,
        restSeconds: we.restSeconds,
        exerciseName: ex.name,
        tracking: ex.tracking,
        targetSets: we.targetSets,
        targetRepsLow: we.targetRepsLow,
        targetRepsHigh: we.targetRepsHigh,
        targetSeconds: we.targetSeconds,
        targetMeters: we.targetMeters,
        supersetGroup: we.supersetGroup,
      })),
    );
    return created.id;
  });
  return { ok: true, id, existing: false };
}

/**
 * Senaste avslutade passet per övning före `before`, med dess set och bästa set.
 * Det här är "förra passet" som visas vid varje övning. Bara pass med minst ett
 * loggat set räknas, och bara status `done` — ett avbrutet pass är inget facit.
 */
export async function previousFor(
  userId: string,
  items: { exerciseId: string; tracking: Tracking }[],
  before: Date,
  ctx: DateCtx,
): Promise<Map<string, PrevPerformance>> {
  const out = new Map<string, PrevPerformance>();
  if (items.length === 0) return out;
  const db = getDb();
  const trackingOf = new Map(items.map((i) => [i.exerciseId, i.tracking]));

  const latest = await db
    .selectDistinctOn([sessionExercises.exerciseId], {
      exerciseId: sessionExercises.exerciseId,
      sessionExerciseId: sessionExercises.id,
      sessionId: sessions.id,
      startedAt: sessions.startedAt,
    })
    .from(sessionExercises)
    .innerJoin(sessions, eq(sessions.id, sessionExercises.sessionId))
    .where(
      and(
        eq(sessions.userId, userId),
        eq(sessions.status, "done"),
        inArray(sessionExercises.exerciseId, [...trackingOf.keys()]),
        lt(sessions.startedAt, before),
        sql`exists (select 1 from ${sessionSets} where ${sessionSets.sessionExerciseId} = ${sessionExercises.id})`,
      ),
    )
    .orderBy(sessionExercises.exerciseId, desc(sessions.startedAt));
  if (latest.length === 0) return out;

  const setRows = await db
    .select()
    .from(sessionSets)
    .where(inArray(sessionSets.sessionExerciseId, latest.map((l) => l.sessionExerciseId)))
    .orderBy(asc(sessionSets.setNumber));

  for (const l of latest) {
    const sets = setRows.filter((s) => s.sessionExerciseId === l.sessionExerciseId).map(toSet);
    out.set(l.exerciseId, {
      sessionId: l.sessionId,
      startedAt: l.startedAt.toISOString(),
      dateLabel: dateLabel(l.startedAt, ctx),
      sets,
      best: bestOf(sets, trackingOf.get(l.exerciseId) ?? "weight_reps"),
    });
  }
  return out;
}

export async function loadSession(userId: string, sessionId: string, ctx: DateCtx): Promise<SessionDTO | null> {
  const db = getDb();
  const [s] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .limit(1);
  if (!s) return null;

  const items = await db
    .select()
    .from(sessionExercises)
    .where(eq(sessionExercises.sessionId, s.id))
    .orderBy(asc(sessionExercises.position));
  const setRows = items.length
    ? await db
        .select()
        .from(sessionSets)
        .where(inArray(sessionSets.sessionExerciseId, items.map((i) => i.id)))
        .orderBy(asc(sessionSets.setNumber))
    : [];
  const previous = await previousFor(
    userId,
    items.map((i) => ({ exerciseId: i.exerciseId, tracking: i.tracking as Tracking })),
    s.startedAt,
    ctx,
  );

  return {
    id: s.id,
    workoutName: s.workoutName,
    status: s.status as SessionDTO["status"],
    startedAt: s.startedAt.toISOString(),
    finishedAt: s.finishedAt?.toISOString() ?? null,
    exercises: items.map((i) => ({
      id: i.id,
      exerciseId: i.exerciseId,
      name: i.exerciseName,
      tracking: i.tracking as Tracking,
      position: i.position,
      restSeconds: i.restSeconds,
      supersetGroup: i.supersetGroup,
      targetSets: i.targetSets,
      targetRepsLow: i.targetRepsLow,
      targetRepsHigh: i.targetRepsHigh,
      targetSeconds: i.targetSeconds,
      targetMeters: i.targetMeters,
      sets: setRows.filter((r) => r.sessionExerciseId === i.id).map(toSet),
      previous: previous.get(i.exerciseId) ?? null,
    })),
  };
}

type FinishResult = { ok: true } | { ok: false; error: "not_found" | "not_active" | "no_sets" };

/**
 * Avslutar eller avbryter. Först när ett pass avslutas (`done`) flyttas rotationen
 * till passet efter det som kördes — ett missat eller avbrutet pass ändrar ingenting.
 */
export async function finishSession(
  userId: string,
  sessionId: string,
  status: "done" | "abandoned",
): Promise<FinishResult> {
  const db = getDb();
  const [s] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .limit(1);
  if (!s) return { ok: false, error: "not_found" };
  if (s.status === status) return { ok: true };
  if (s.status !== "active") return { ok: false, error: "not_active" };

  if (status === "done") {
    const [{ n }] = await db
      .select({ n: sql<string>`count(${sessionSets.id})` })
      .from(sessionSets)
      .innerJoin(sessionExercises, eq(sessionExercises.id, sessionSets.sessionExerciseId))
      .where(eq(sessionExercises.sessionId, s.id));
    if (Number(n) === 0) return { ok: false, error: "no_sets" };
  }

  await db.transaction(async (tx) => {
    await tx.update(sessions).set({ status, finishedAt: new Date() }).where(eq(sessions.id, s.id));
    if (status === "done" && s.programId && s.workoutId) {
      const [w] = await tx
        .select({ position: programWorkouts.position })
        .from(programWorkouts)
        .where(eq(programWorkouts.id, s.workoutId))
        .limit(1);
      const [{ count }] = await tx
        .select({ count: sql<string>`count(*)` })
        .from(programWorkouts)
        .where(eq(programWorkouts.programId, s.programId));
      if (w && Number(count) > 0) {
        await tx
          .update(programs)
          .set({ rotationIndex: (w.position + 1) % Number(count) })
          .where(and(eq(programs.id, s.programId), eq(programs.userId, userId)));
      }
    }
  });
  return { ok: true };
}

// ----------------------------------------------------------------------- set

export interface SetFields {
  weightKg?: number | null;
  reps?: number | null;
  durationSec?: number | null;
  distanceM?: number | null;
  rpe?: number | null;
  setType?: SetType;
}

type AddSetResult =
  | { ok: true; set: SetDTO }
  | { ok: false; error: "not_found" | "unknown_exercise" | "session_closed" | "set_number_taken" };

/** Idempotent på `clientId`: samma set två gånger blir en rad. */
export async function addSet(
  userId: string,
  sessionId: string,
  input: SetFields & { sessionExerciseId: string; clientId: string; setNumber?: number },
): Promise<AddSetResult> {
  const db = getDb();
  const [s] = await db
    .select({ id: sessions.id, status: sessions.status })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .limit(1);
  if (!s) return { ok: false, error: "not_found" };
  if (s.status === "abandoned") return { ok: false, error: "session_closed" };

  const [item] = await db
    .select({ id: sessionExercises.id })
    .from(sessionExercises)
    .where(and(eq(sessionExercises.id, input.sessionExerciseId), eq(sessionExercises.sessionId, s.id)))
    .limit(1);
  if (!item) return { ok: false, error: "unknown_exercise" };

  let setNumber = input.setNumber;
  if (!setNumber) {
    const [{ max }] = await db
      .select({ max: sql<string>`coalesce(max(${sessionSets.setNumber}), 0)` })
      .from(sessionSets)
      .where(eq(sessionSets.sessionExerciseId, item.id));
    setNumber = Number(max) + 1;
  }

  const inserted = await db
    .insert(sessionSets)
    .values({
      sessionExerciseId: item.id,
      setNumber,
      weightKg: str(input.weightKg),
      reps: input.reps ?? null,
      durationSec: input.durationSec ?? null,
      distanceM: input.distanceM ?? null,
      rpe: str(input.rpe),
      setType: input.setType ?? "normal",
      clientId: input.clientId,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return { ok: true, set: toSet(inserted[0]) };

  // Konflikt: antingen är det samma set som skickats förut (ok), eller så är
  // setnumret upptaget av ett annat set.
  const [dup] = await db.select().from(sessionSets).where(eq(sessionSets.clientId, input.clientId)).limit(1);
  if (dup && dup.sessionExerciseId === item.id) return { ok: true, set: toSet(dup) };
  return { ok: false, error: "set_number_taken" };
}

async function ownsSet(userId: string, sessionId: string, setId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: sessionSets.id })
    .from(sessionSets)
    .innerJoin(sessionExercises, eq(sessionExercises.id, sessionSets.sessionExerciseId))
    .innerJoin(sessions, eq(sessions.id, sessionExercises.sessionId))
    .where(and(eq(sessionSets.id, setId), eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .limit(1);
  return !!row;
}

export async function updateSet(
  userId: string,
  sessionId: string,
  setId: string,
  fields: SetFields,
): Promise<SetDTO | null> {
  if (!(await ownsSet(userId, sessionId, setId))) return null;
  const patch: Partial<typeof sessionSets.$inferInsert> = {};
  if (fields.weightKg !== undefined) patch.weightKg = str(fields.weightKg);
  if (fields.reps !== undefined) patch.reps = fields.reps;
  if (fields.durationSec !== undefined) patch.durationSec = fields.durationSec;
  if (fields.distanceM !== undefined) patch.distanceM = fields.distanceM;
  if (fields.rpe !== undefined) patch.rpe = str(fields.rpe);
  if (fields.setType !== undefined) patch.setType = fields.setType;
  if (Object.keys(patch).length === 0) {
    const [row] = await getDb().select().from(sessionSets).where(eq(sessionSets.id, setId)).limit(1);
    return row ? toSet(row) : null;
  }
  const [row] = await getDb().update(sessionSets).set(patch).where(eq(sessionSets.id, setId)).returning();
  return row ? toSet(row) : null;
}

export async function deleteSet(userId: string, sessionId: string, setId: string): Promise<boolean> {
  if (!(await ownsSet(userId, sessionId, setId))) return false;
  await getDb().delete(sessionSets).where(eq(sessionSets.id, setId));
  return true;
}

// ------------------------------------------------------------------ historik

export interface HistoryEntry {
  sessionId: string;
  startedAt: string;
  dateLabel: string;
  workoutName: string;
  tracking: Tracking;
  sets: SetDTO[];
  best: BestDTO | null;
}

export interface ExerciseHistory {
  exercise: ExerciseRef;
  /** Nyast först. */
  entries: HistoryEntry[];
  pb: { best: BestDTO; startedAt: string; dateLabel: string } | null;
}

export async function exerciseHistory(
  userId: string,
  exerciseId: string,
  ctx: DateCtx,
  limit = 100,
): Promise<ExerciseHistory | null> {
  const exercise = await getExercise(userId, exerciseId);
  if (!exercise) return null;
  const db = getDb();

  const rows = await db
    .select({
      sessionExerciseId: sessionExercises.id,
      tracking: sessionExercises.tracking,
      sessionId: sessions.id,
      startedAt: sessions.startedAt,
      workoutName: sessions.workoutName,
    })
    .from(sessionExercises)
    .innerJoin(sessions, eq(sessions.id, sessionExercises.sessionId))
    .where(
      and(
        eq(sessions.userId, userId),
        eq(sessions.status, "done"),
        eq(sessionExercises.exerciseId, exercise.id),
        sql`exists (select 1 from ${sessionSets} where ${sessionSets.sessionExerciseId} = ${sessionExercises.id})`,
      ),
    )
    .orderBy(desc(sessions.startedAt))
    .limit(Math.min(limit, 200));

  const setRows = rows.length
    ? await db
        .select()
        .from(sessionSets)
        .where(inArray(sessionSets.sessionExerciseId, rows.map((r) => r.sessionExerciseId)))
        .orderBy(asc(sessionSets.setNumber))
    : [];

  const entries: HistoryEntry[] = rows.map((r) => {
    const sets = setRows.filter((s) => s.sessionExerciseId === r.sessionExerciseId).map(toSet);
    const tracking = r.tracking as Tracking;
    return {
      sessionId: r.sessionId,
      startedAt: r.startedAt.toISOString(),
      dateLabel: dateLabel(r.startedAt, ctx),
      workoutName: r.workoutName,
      tracking,
      sets,
      best: bestOf(sets, tracking),
    };
  });

  let pb: ExerciseHistory["pb"] = null;
  for (const e of entries) {
    if (!e.best) continue;
    if (!pb || bestScore(e.best, e.tracking) > bestScore(pb.best, exercise.tracking)) {
      pb = { best: e.best, startedAt: e.startedAt, dateLabel: e.dateLabel };
    }
  }
  return { exercise, entries, pb };
}

export interface RecentSession {
  id: string;
  workoutName: string;
  startedAt: string;
  dateLabel: string;
  sets: number;
  volumeKg: number;
}

export async function recentSessions(userId: string, ctx: DateCtx, limit = 8): Promise<RecentSession[]> {
  const rows = await getDb()
    .select({
      id: sessions.id,
      workoutName: sessions.workoutName,
      startedAt: sessions.startedAt,
      sets: sql<string>`count(${sessionSets.id}) filter (where ${sessionSets.setType} <> 'warmup')`,
      volume: sql<string>`coalesce(sum(${sessionSets.weightKg} * ${sessionSets.reps}) filter (where ${sessionSets.setType} <> 'warmup'), 0)`,
    })
    .from(sessions)
    .leftJoin(sessionExercises, eq(sessionExercises.sessionId, sessions.id))
    .leftJoin(sessionSets, eq(sessionSets.sessionExerciseId, sessionExercises.id))
    .where(and(eq(sessions.userId, userId), eq(sessions.status, "done")))
    .groupBy(sessions.id)
    .orderBy(desc(sessions.startedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    workoutName: r.workoutName,
    startedAt: r.startedAt.toISOString(),
    dateLabel: dateLabel(r.startedAt, ctx),
    sets: Number(r.sets),
    volumeKg: Math.round(Number(r.volume)),
  }));
}
