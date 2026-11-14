"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  MUSCLE_GROUPS,
  TRACKING_LABEL,
  type ExerciseRef,
  type ProgramDTO,
  type Tracking,
} from "@/lib/training/types";

interface EditExercise {
  key: string;
  exerciseId: string;
  name: string;
  tracking: Tracking;
  sets: string;
  repsLow: string;
  repsHigh: string;
  seconds: string;
  meters: string;
  rest: string;
  /** true = superset med övningen ovanför. */
  linkPrev: boolean;
}

interface EditWorkout {
  key: string;
  name: string;
  exercises: EditExercise[];
}

const uid = () => crypto.randomUUID();
const letter = (i: number) => String.fromCharCode(65 + (i % 26));

function defaultsFor(tracking: Tracking): Pick<EditExercise, "sets" | "repsLow" | "repsHigh" | "seconds" | "meters" | "rest"> {
  switch (tracking) {
    case "weight_reps":
      return { sets: "3", repsLow: "8", repsHigh: "10", seconds: "", meters: "", rest: "90" };
    case "reps_only":
      return { sets: "3", repsLow: "8", repsHigh: "12", seconds: "", meters: "", rest: "90" };
    case "time":
      return { sets: "3", repsLow: "", repsHigh: "", seconds: "30", meters: "", rest: "60" };
    case "distance":
      return { sets: "1", repsLow: "", repsHigh: "", seconds: "", meters: "1000", rest: "60" };
  }
}

function fromProgram(program: ProgramDTO | null): { name: string; workouts: EditWorkout[] } {
  if (!program) {
    return {
      name: "Mitt program",
      workouts: ["A", "B", "C"].map((l) => ({ key: uid(), name: `Pass ${l}`, exercises: [] })),
    };
  }
  return {
    name: program.name,
    workouts: program.workouts.map((w) => ({
      key: uid(),
      name: w.name,
      exercises: w.exercises.map((e, i) => ({
        key: uid(),
        exerciseId: e.exerciseId,
        name: e.name,
        tracking: e.tracking,
        sets: String(e.targetSets),
        repsLow: e.targetRepsLow?.toString() ?? "",
        repsHigh: e.targetRepsHigh?.toString() ?? "",
        seconds: e.targetSeconds?.toString() ?? "",
        meters: e.targetMeters?.toString() ?? "",
        rest: String(e.restSeconds),
        linkPrev: i > 0 && e.supersetGroup != null && w.exercises[i - 1].supersetGroup === e.supersetGroup,
      })),
    })),
  };
}

const toInt = (s: string): number | null => {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function buildPayload(name: string, workouts: EditWorkout[]) {
  return {
    name: name.trim(),
    workouts: workouts.map((w) => {
      // Efterföljande övningar med linkPrev delar supersetgrupp med den före.
      const groups: (number | null)[] = w.exercises.map(() => null);
      let next = 1;
      w.exercises.forEach((e, i) => {
        if (i > 0 && e.linkPrev) {
          if (groups[i - 1] == null) groups[i - 1] = next++;
          groups[i] = groups[i - 1];
        }
      });
      return {
        name: w.name.trim(),
        exercises: w.exercises.map((e, i) => ({
          exerciseId: e.exerciseId,
          targetSets: toInt(e.sets) ?? 3,
          targetRepsLow: e.tracking === "weight_reps" || e.tracking === "reps_only" ? toInt(e.repsLow) : null,
          targetRepsHigh: e.tracking === "weight_reps" || e.tracking === "reps_only" ? toInt(e.repsHigh) : null,
          targetSeconds: e.tracking === "time" ? toInt(e.seconds) : null,
          targetMeters: e.tracking === "distance" ? toInt(e.meters) : null,
          restSeconds: Number.parseInt(e.rest, 10) >= 0 ? Number.parseInt(e.rest, 10) : 90,
          supersetGroup: groups[i],
        })),
      };
    }),
  };
}

export function ProgramEditor({ initial }: { initial: ProgramDTO | null }) {
  const router = useRouter();
  const start = useRef(fromProgram(initial)).current;
  const [name, setName] = useState(start.name);
  const [workouts, setWorkouts] = useState<EditWorkout[]>(start.workouts);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateWorkout = (wi: number, fn: (w: EditWorkout) => EditWorkout) =>
    setWorkouts((all) => all.map((w, i) => (i === wi ? fn(w) : w)));
  const updateExercise = (wi: number, ei: number, patch: Partial<EditExercise>) =>
    updateWorkout(wi, (w) => ({ ...w, exercises: w.exercises.map((e, i) => (i === ei ? { ...e, ...patch } : e)) }));

  function setCount(count: number) {
    setWorkouts((all) => {
      if (count > all.length) {
        const extra = Array.from({ length: count - all.length }, (_, k) => ({
          key: uid(),
          name: `Pass ${letter(all.length + k)}`,
          exercises: [] as EditExercise[],
        }));
        return [...all, ...extra];
      }
      const removed = all.slice(count);
      if (removed.some((w) => w.exercises.length > 0) && !confirm("Passen som tas bort har övningar. Ta bort ändå?")) {
        return all;
      }
      return all.slice(0, count);
    });
  }

  function moveExercise(wi: number, ei: number, dir: -1 | 1) {
    updateWorkout(wi, (w) => {
      const to = ei + dir;
      if (to < 0 || to >= w.exercises.length) return w;
      const list = [...w.exercises];
      [list[ei], list[to]] = [list[to], list[ei]];
      // Superset-länken hör till raden, så första raden får aldrig vara länkad.
      if (list[0]) list[0] = { ...list[0], linkPrev: false };
      return { ...w, exercises: list };
    });
  }

  function addExercise(wi: number, ref: ExerciseRef) {
    updateWorkout(wi, (w) => ({
      ...w,
      exercises: [
        ...w.exercises,
        { key: uid(), exerciseId: ref.id, name: ref.name, tracking: ref.tracking, linkPrev: false, ...defaultsFor(ref.tracking) },
      ],
    }));
    setPickerFor(null);
  }

  async function save() {
    setError(null);
    if (!name.trim()) return setError("Programmet behöver ett namn.");
    for (const w of workouts) {
      if (!w.name.trim()) return setError("Varje pass behöver ett namn.");
      if (w.exercises.length === 0) return setError(`${w.name} har inga övningar än.`);
    }
    setBusy(true);
    try {
      const res = await fetch(initial ? `/api/program/${initial.id}` : "/api/program", {
        method: initial ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildPayload(name, workouts)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return setError(data.error === "invalid" ? "Något fält har ett ogiltigt värde." : "Kunde inte spara programmet.");
      }
      router.push("/train");
      router.refresh();
    } catch {
      setError("Ingen kontakt med servern.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial) return;
    if (!confirm("Ta bort programmet? Genomförda pass och historiken ligger kvar.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/program/${initial.id}`, { method: "DELETE" });
      if (!res.ok) return setError("Kunde inte ta bort programmet.");
      router.push("/train");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="card flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="muted text-xs">Programnamn</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </label>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Antal pass i rotationen</p>
            <p className="muted text-xs">Du roterar A → B → C → A …</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn h-11 w-11 px-0"
              onClick={() => setCount(Math.max(1, workouts.length - 1))}
              disabled={workouts.length <= 1}
              aria-label="Färre pass"
            >
              −
            </button>
            <span className="w-6 text-center text-xl font-semibold tabular-nums">{workouts.length}</span>
            <button
              type="button"
              className="btn h-11 w-11 px-0"
              onClick={() => setCount(Math.min(14, workouts.length + 1))}
              disabled={workouts.length >= 14}
              aria-label="Fler pass"
            >
              +
            </button>
          </div>
        </div>
      </section>

      {workouts.map((w, wi) => (
        <section key={w.key} className="card flex flex-col gap-3">
          <input
            className="input font-semibold"
            value={w.name}
            maxLength={60}
            aria-label={`Namn på pass ${wi + 1}`}
            onChange={(e) => updateWorkout(wi, (x) => ({ ...x, name: e.target.value }))}
          />

          {w.exercises.map((e, ei) => (
            <div key={e.key} className="flex flex-col gap-2 rounded-xl border border-line p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{e.name}</p>
                  <p className="muted text-xs">{TRACKING_LABEL[e.tracking]}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" className="btn h-9 min-h-0 w-9 px-0" onClick={() => moveExercise(wi, ei, -1)} disabled={ei === 0} aria-label="Flytta upp">
                    ↑
                  </button>
                  <button type="button" className="btn h-9 min-h-0 w-9 px-0" onClick={() => moveExercise(wi, ei, 1)} disabled={ei === w.exercises.length - 1} aria-label="Flytta ned">
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn h-9 min-h-0 w-9 px-0"
                    onClick={() =>
                      updateWorkout(wi, (x) => {
                        const list = x.exercises.filter((_, i) => i !== ei);
                        if (list[0]) list[0] = { ...list[0], linkPrev: false };
                        return { ...x, exercises: list };
                      })
                    }
                    aria-label="Ta bort övning"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <Field label="Set" value={e.sets} onChange={(v) => updateExercise(wi, ei, { sets: v })} />
                {e.tracking === "weight_reps" || e.tracking === "reps_only" ? (
                  <>
                    <Field label="Reps från" value={e.repsLow} onChange={(v) => updateExercise(wi, ei, { repsLow: v })} />
                    <Field label="Reps till" value={e.repsHigh} onChange={(v) => updateExercise(wi, ei, { repsHigh: v })} />
                  </>
                ) : e.tracking === "time" ? (
                  <Field label="Sekunder" value={e.seconds} onChange={(v) => updateExercise(wi, ei, { seconds: v })} />
                ) : (
                  <Field label="Meter" value={e.meters} onChange={(v) => updateExercise(wi, ei, { meters: v })} />
                )}
                <Field label="Vila (s)" value={e.rest} onChange={(v) => updateExercise(wi, ei, { rest: v })} />
              </div>

              {ei > 0 ? (
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={e.linkPrev}
                    onChange={(ev) => updateExercise(wi, ei, { linkPrev: ev.target.checked })}
                  />
                  Superset med övningen ovanför
                </label>
              ) : null}
            </div>
          ))}

          <button type="button" className="btn w-full" onClick={() => setPickerFor(wi)}>
            + Lägg till övning
          </button>
        </section>
      ))}

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-3">
          {initial ? (
            <button type="button" className="btn" onClick={remove} disabled={busy}>
              Ta bort
            </button>
          ) : null}
          <button type="button" className="btn btn-primary flex-1" onClick={save} disabled={busy}>
            {busy ? "Sparar…" : "Spara program"}
          </button>
        </div>
      </div>

      {pickerFor !== null ? (
        <ExercisePicker onPick={(ref) => addExercise(pickerFor, ref)} onClose={() => setPickerFor(null)} />
      ) : null}
    </>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="muted">{label}</span>
      <input
        className="input text-center"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
      />
    </label>
  );
}

function ExercisePicker({ onPick, onClose }: { onPick: (e: ExerciseRef) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<ExerciseRef[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [group, setGroup] = useState<string>("annat");
  const [tracking, setTracking] = useState<Tracking>("weight_reps");
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/exercises?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) setList((await res.json()).exercises);
      } catch {
        /* avbruten eller offline — listan får stå kvar */
      }
    }, 180);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q]);

  async function create() {
    setCreateError(null);
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: q.trim(), muscleGroup: group, tracking }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return onPick(data.exercise);
    setCreateError(data.error === "name_taken" ? "Du har redan en övning med det namnet." : "Kunde inte skapa övningen.");
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg px-4 pb-10 pt-[calc(env(safe-area-inset-top)+16px)]">
      <div className="mx-auto flex max-w-md flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            className="input"
            placeholder="Sök övning, t.ex. bänk"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <button type="button" className="btn px-4" onClick={onClose}>
            Stäng
          </button>
        </div>

        {list === null ? <p className="muted text-sm">Hämtar…</p> : null}
        <ul className="flex flex-col divide-y divide-line">
          {list?.map((e) => (
            <li key={e.id}>
              <button type="button" className="flex w-full items-center justify-between gap-3 py-3 text-left" onClick={() => onPick(e)}>
                <span>
                  <span className="block font-medium">{e.name}</span>
                  <span className="muted text-xs">
                    {e.muscleGroup}
                    {e.equipment ? ` · ${e.equipment}` : ""}
                    {e.own ? " · egen" : ""}
                  </span>
                </span>
                <span className="text-accent text-xl">+</span>
              </button>
            </li>
          ))}
        </ul>
        {list && list.length === 0 ? <p className="muted text-sm">Ingen träff.</p> : null}

        <div className="card flex flex-col gap-3">
          <button type="button" className="text-left text-sm font-medium" onClick={() => setCreating((v) => !v)}>
            {creating ? "▾" : "▸"} Skapa egen övning
          </button>
          {creating ? (
            <>
              <p className="muted text-xs">
                Namnet tas från sökfältet: <strong className="text-ink">{q.trim() || "—"}</strong>
              </p>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="muted text-xs">Muskelgrupp</span>
                <select className="input" value={group} onChange={(e) => setGroup(e.target.value)}>
                  {MUSCLE_GROUPS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="muted text-xs">Hur loggas den?</span>
                <select className="input" value={tracking} onChange={(e) => setTracking(e.target.value as Tracking)}>
                  {(Object.keys(TRACKING_LABEL) as Tracking[]).map((t) => (
                    <option key={t} value={t}>
                      {TRACKING_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              {createError ? <p className="text-danger text-xs">{createError}</p> : null}
              <button type="button" className="btn btn-primary w-full" onClick={create} disabled={!q.trim()}>
                Skapa och lägg till
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
