import { z } from "zod";

const int = (min: number, max: number) => z.number().int().min(min).max(max);
const optInt = (min: number, max: number) => int(min, max).nullable().optional();

export const exerciseInput = z.object({
  name: z.string().trim().min(1).max(80),
  muscleGroup: z.string().trim().min(1).max(30).default("annat"),
  equipment: z.string().trim().max(40).nullable().optional(),
  tracking: z.enum(["weight_reps", "reps_only", "time", "distance"]).default("weight_reps"),
});

const programExercise = z.object({
  exerciseId: z.uuid(),
  targetSets: int(1, 20).default(3),
  targetRepsLow: optInt(1, 200),
  targetRepsHigh: optInt(1, 200),
  targetSeconds: optInt(1, 7200),
  targetMeters: optInt(1, 100000),
  restSeconds: int(0, 1200).default(90),
  supersetGroup: optInt(1, 50),
  notes: z.string().trim().max(300).nullable().optional(),
});

const programWorkout = z.object({
  name: z.string().trim().min(1).max(60),
  notes: z.string().trim().max(300).nullable().optional(),
  exercises: z.array(programExercise).max(30),
});

export const programInput = z.object({
  name: z.string().trim().min(1).max(60),
  workouts: z.array(programWorkout).min(1).max(14),
});

export type ProgramInput = z.infer<typeof programInput>;

export const startSessionInput = z.object({
  workoutId: z.uuid(),
  clientId: z.uuid().optional(),
});

export const finishSessionInput = z.object({
  status: z.enum(["done", "abandoned"]),
});

const setFields = {
  weightKg: z.number().min(0).max(2000).nullable().optional(),
  reps: optInt(0, 1000),
  durationSec: optInt(0, 86400),
  distanceM: optInt(0, 1000000),
  rpe: z.number().min(1).max(10).nullable().optional(),
  setType: z.enum(["normal", "warmup", "dropset"]).optional(),
};

export const createSetInput = z.object({
  sessionExerciseId: z.uuid(),
  clientId: z.uuid(),
  setNumber: int(1, 200).optional(),
  ...setFields,
});

export const patchSetInput = z.object(setFields);
