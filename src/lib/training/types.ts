/**
 * Typer och rena hjälpfunktioner för träningsdelen. Inga serverberoenden här —
 * filen importeras även av klientkomponenter.
 */
import { e1rm } from "@/lib/nutrition";

export type Tracking = "weight_reps" | "reps_only" | "time" | "distance";
export type SetType = "normal" | "warmup" | "dropset";

export const TRACKING_LABEL: Record<Tracking, string> = {
  weight_reps: "Vikt × reps",
  reps_only: "Reps (kroppsvikt)",
  time: "Tid",
  distance: "Distans",
};

export const MUSCLE_GROUPS = [
  "bröst",
  "rygg",
  "axlar",
  "biceps",
  "triceps",
  "ben",
  "mage",
  "kondition",
  "annat",
] as const;

// ------------------------------------------------------------------ program

export interface ExerciseRef {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  tracking: Tracking;
  /** true = egen övning för kontot, false = globalt bibliotek. */
  own: boolean;
}

export interface ProgramExerciseDTO {
  exerciseId: string;
  name: string;
  tracking: Tracking;
  muscleGroup: string;
  targetSets: number;
  targetRepsLow: number | null;
  targetRepsHigh: number | null;
  targetSeconds: number | null;
  targetMeters: number | null;
  restSeconds: number;
  supersetGroup: number | null;
  notes: string | null;
}

export interface WorkoutDTO {
  id: string;
  position: number;
  name: string;
  notes: string | null;
  exercises: ProgramExerciseDTO[];
}

export interface ProgramDTO {
  id: string;
  name: string;
  rotationIndex: number;
  workouts: WorkoutDTO[];
}

// ------------------------------------------------------------------- pass

export interface SetDTO {
  id: string;
  clientId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  distanceM: number | null;
  rpe: number | null;
  setType: SetType;
  completedAt: string;
}

export interface BestDTO {
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  distanceM: number | null;
  e1rm: number | null;
}

export interface PrevPerformance {
  sessionId: string;
  startedAt: string;
  dateLabel: string;
  sets: SetDTO[];
  best: BestDTO | null;
}

export interface SessionExerciseDTO {
  id: string;
  exerciseId: string;
  name: string;
  tracking: Tracking;
  position: number;
  restSeconds: number;
  supersetGroup: number | null;
  targetSets: number;
  targetRepsLow: number | null;
  targetRepsHigh: number | null;
  targetSeconds: number | null;
  targetMeters: number | null;
  sets: SetDTO[];
  previous: PrevPerformance | null;
}

export interface SessionDTO {
  id: string;
  workoutName: string;
  status: "active" | "done" | "abandoned";
  startedAt: string;
  finishedAt: string | null;
  exercises: SessionExerciseDTO[];
}

// ---------------------------------------------------------------- formatering

/** 62.5 → "62,5", 60 → "60". */
export function fmtNum(n: number, decimals = 2): string {
  const rounded = Math.round(n * 10 ** decimals) / 10 ** decimals;
  return String(rounded).replace(".", ",");
}

export function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s} s`;
}

export function fmtSet(set: Pick<SetDTO, "weightKg" | "reps" | "durationSec" | "distanceM">, tracking: Tracking): string {
  switch (tracking) {
    case "weight_reps":
      return `${set.weightKg != null ? fmtNum(set.weightKg) : "0"} kg × ${set.reps ?? 0}`;
    case "reps_only":
      return set.weightKg ? `${set.reps ?? 0} reps +${fmtNum(set.weightKg)} kg` : `${set.reps ?? 0} reps`;
    case "time":
      return fmtDuration(set.durationSec ?? 0);
    case "distance":
      return `${set.distanceM ?? 0} m${set.durationSec ? ` på ${fmtDuration(set.durationSec)}` : ""}`;
  }
}

export function fmtTarget(
  t: Pick<SessionExerciseDTO, "tracking" | "targetSets" | "targetRepsLow" | "targetRepsHigh" | "targetSeconds" | "targetMeters">,
): string {
  const sets = `${t.targetSets} ×`;
  switch (t.tracking) {
    case "weight_reps":
    case "reps_only": {
      if (t.targetRepsLow && t.targetRepsHigh && t.targetRepsLow !== t.targetRepsHigh) {
        return `${sets} ${t.targetRepsLow}–${t.targetRepsHigh}`;
      }
      const reps = t.targetRepsHigh ?? t.targetRepsLow;
      return reps ? `${sets} ${reps}` : `${t.targetSets} set`;
    }
    case "time":
      return t.targetSeconds ? `${sets} ${fmtDuration(t.targetSeconds)}` : `${t.targetSets} set`;
    case "distance":
      return t.targetMeters ? `${sets} ${t.targetMeters} m` : `${t.targetSets} set`;
  }
}

// ------------------------------------------------------------------ framsteg

/** Sets som räknas som arbetsset: inte uppvärmning. */
export function workingSets<T extends { setType: SetType }>(sets: T[]): T[] {
  return sets.filter((s) => s.setType !== "warmup");
}

/** Jämförelsetal för ett enskilt set: uppskattat 1RM, reps, sekunder eller meter. */
export function setScore(
  s: Pick<SetDTO, "weightKg" | "reps" | "durationSec" | "distanceM">,
  tracking: Tracking,
): number {
  switch (tracking) {
    case "weight_reps":
      return e1rm(s.weightKg ?? 0, s.reps ?? 0);
    case "reps_only":
      return s.reps ?? 0;
    case "time":
      return s.durationSec ?? 0;
    case "distance":
      return s.distanceM ?? 0;
  }
}

/** Bästa arbetsset enligt spårningstypen, med uppskattat 1RM (Epley) för vikt × reps. */
export function bestOf(
  sets: Pick<SetDTO, "weightKg" | "reps" | "durationSec" | "distanceM" | "setType">[],
  tracking: Tracking,
): BestDTO | null {
  const work = workingSets(sets);
  if (work.length === 0) return null;
  const top = work.reduce((a, b) => (setScore(b, tracking) > setScore(a, tracking) ? b : a));
  return {
    weightKg: top.weightKg,
    reps: top.reps,
    durationSec: top.durationSec,
    distanceM: top.distanceM,
    e1rm: tracking === "weight_reps" ? e1rm(top.weightKg ?? 0, top.reps ?? 0) : null,
  };
}

/** Jämförelsetal för ett set, samma skala som `bestOf`. */
export function bestScore(best: BestDTO | null, tracking: Tracking): number {
  if (!best) return 0;
  switch (tracking) {
    case "weight_reps":
      return best.e1rm ?? 0;
    case "reps_only":
      return best.reps ?? 0;
    case "time":
      return best.durationSec ?? 0;
    case "distance":
      return best.distanceM ?? 0;
  }
}

export interface Hint {
  kind: "up" | "hold" | "reps" | "first";
  text: string;
}

/**
 * Dubbel progression: tar sig alla arbetsset förra gången till övre repsgränsen
 * är det dags att höja vikten, annars sikta på fler reps med samma vikt.
 */
export function progressionHint(
  prev: PrevPerformance | null,
  target: Pick<SessionExerciseDTO, "tracking" | "targetSets" | "targetRepsLow" | "targetRepsHigh">,
): Hint | null {
  if (!prev) return { kind: "first", text: "Första gången — hitta en vikt du klarar med bra form." };
  if (target.tracking !== "weight_reps") return null;
  const work = workingSets(prev.sets);
  const top = target.targetRepsHigh;
  const low = target.targetRepsLow ?? top;
  if (work.length === 0 || !top) return null;

  const heaviest = Math.max(...work.map((s) => s.weightKg ?? 0));
  const atTop = work.length >= target.targetSets && work.every((s) => (s.reps ?? 0) >= top);
  if (atTop) {
    return { kind: "up", text: `Alla set nådde ${top} reps — höj vikten (t.ex. ${fmtNum(heaviest + 2.5)} kg).` };
  }
  if (low && work.some((s) => (s.reps ?? 0) < low)) {
    return { kind: "hold", text: `Behåll ${fmtNum(heaviest)} kg tills alla set når ${low} reps.` };
  }
  return { kind: "reps", text: `Sikta på en rep till per set innan du höjer vikten.` };
}
