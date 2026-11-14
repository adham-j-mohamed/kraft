"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  bestOf,
  bestScore,
  fmtDuration,
  fmtNum,
  fmtSet,
  fmtTarget,
  progressionHint,
  setScore,
  workingSets,
  type SessionDTO,
  type SessionExerciseDTO,
  type SetDTO,
  type SetType,
} from "@/lib/training/types";

const JSON_HEADERS = { "content-type": "application/json" };

interface Rest {
  endsAt: number;
  total: number;
  label: string;
}

export function SessionLogger({ initial }: { initial: SessionDTO }) {
  const router = useRouter();
  const readOnly = initial.status !== "active";
  const [exercises, setExercises] = useState<SessionExerciseDTO[]>(initial.exercises);
  const [rest, setRest] = useState<Rest | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const beeped = useRef(false);

  // Håll skärmen tänd under passet (stöds i Safari från iOS 16.4; fel ignoreras).
  useEffect(() => {
    if (readOnly || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) void next.release();
        else lock = next;
      } catch {
        /* nekad, t.ex. lågenergiläge */
      }
    };
    void acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [readOnly]);

  // Tick för vilotimern.
  useEffect(() => {
    if (!rest) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [rest]);

  const remaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;
  useEffect(() => {
    if (!rest || remaining > 0 || beeped.current) return;
    beeped.current = true;
    try {
      navigator.vibrate?.([200, 100, 200]);
      const ctx = audio.current;
      if (ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.value = 0.15;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      /* ljud är en bonus */
    }
  }, [rest, remaining]);

  const startRest = useCallback((seconds: number, label: string) => {
    // AudioContext måste skapas i en tryckhändelse för att Safari ska släppa fram ljud senare.
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    } catch {
      /* inget ljud */
    }
    if (seconds <= 0) return setRest(null);
    beeped.current = false;
    setNow(Date.now());
    setRest({ endsAt: Date.now() + seconds * 1000, total: seconds, label });
  }, []);

  const replaceSets = useCallback((exerciseId: string, fn: (sets: SetDTO[]) => SetDTO[]) => {
    setExercises((all) => all.map((e) => (e.id === exerciseId ? { ...e, sets: fn(e.sets) } : e)));
  }, []);

  async function finish() {
    const total = exercises.reduce((n, e) => n + e.sets.length, 0);
    if (total === 0) {
      setFinishError("Logga minst ett set, eller avbryt passet.");
      return;
    }
    const open = exercises.filter((e) => workingSets(e.sets).length < e.targetSets).length;
    if (open > 0 && !confirm(`${open} övning${open > 1 ? "ar" : ""} har färre set än målet. Avsluta ändå?`)) return;
    setFinishing(true);
    setFinishError(null);
    try {
      const res = await fetch(`/api/sessions/${initial.id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFinishError(data.error === "no_sets" ? "Logga minst ett set, eller avbryt passet." : "Kunde inte avsluta passet.");
        return;
      }
      router.refresh();
    } catch {
      setFinishError("Ingen kontakt med servern.");
    } finally {
      setFinishing(false);
    }
  }

  async function abandon() {
    if (!confirm("Avbryta passet? Det sparas inte i historiken och rotationen ändras inte.")) return;
    setFinishing(true);
    try {
      await fetch(`/api/sessions/${initial.id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: "abandoned" }),
      });
      router.push("/train");
      router.refresh();
    } finally {
      setFinishing(false);
    }
  }

  const totals = summarize(exercises);
  const minutes =
    initial.finishedAt != null
      ? Math.max(1, Math.round((Date.parse(initial.finishedAt) - Date.parse(initial.startedAt)) / 60000))
      : null;

  return (
    <main className={`mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-6 ${rest ? "pb-32" : "pb-10"}`}>
      <header className="flex items-center justify-between">
        <div>
          <p className="muted text-xs uppercase tracking-wide">
            {initial.status === "active" ? "Pågående pass" : initial.status === "done" ? "Klart pass" : "Avbrutet pass"}
          </p>
          <h1 className="text-2xl font-semibold">{initial.workoutName}</h1>
        </div>
        <Link className="btn px-4 py-2 text-sm" href="/train">
          {readOnly ? "Tillbaka" : "Översikt"}
        </Link>
      </header>

      {initial.status === "done" ? (
        <section className="card grid grid-cols-3 gap-2 text-center">
          <Stat label="Tid" value={minutes ? `${minutes} min` : "—"} />
          <Stat label="Set" value={String(totals.sets)} />
          <Stat label="Volym" value={totals.volume > 0 ? `${fmtNum(totals.volume, 0)} kg` : "—"} />
        </section>
      ) : null}
      {initial.status === "abandoned" ? (
        <p className="muted text-sm">Passet avbröts och räknas inte i historiken eller rotationen.</p>
      ) : null}

      {exercises.map((ex) => {
        const group = ex.supersetGroup;
        const members = group != null ? exercises.filter((x) => x.supersetGroup === group) : [];
        const idx = members.findIndex((m) => m.id === ex.id);
        const nextInSuperset = group != null && idx >= 0 && idx < members.length - 1 ? members[idx + 1] : null;
        return (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            sessionId={initial.id}
            readOnly={readOnly}
            showSupersetTag={group != null}
            supersetNext={nextInSuperset?.name ?? null}
            startsGroup={group != null && idx === 0}
            onSets={replaceSets}
            onRest={startRest}
          />
        );
      })}

      {!readOnly ? (
        <section className="flex flex-col gap-3">
          {finishError ? <p className="text-danger text-sm">{finishError}</p> : null}
          <button type="button" className="btn btn-primary w-full" onClick={finish} disabled={finishing}>
            {finishing ? "Avslutar…" : "Avsluta pass"}
          </button>
          <button type="button" className="btn w-full" onClick={abandon} disabled={finishing}>
            Avbryt passet
          </button>
        </section>
      ) : null}

      {rest ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="muted truncate text-xs">{remaining === 0 ? "Vilan är slut" : `Vila · ${rest.label}`}</p>
              <p className={`text-3xl font-semibold tabular-nums ${remaining === 0 ? "text-accent" : ""}`}>
                {remaining === 0 ? "Kör!" : fmtDuration(remaining)}
              </p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${Math.min(100, (remaining / rest.total) * 100)}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn px-4"
              onClick={() => {
                beeped.current = false;
                setRest((r) => (r ? { ...r, endsAt: Math.max(r.endsAt, Date.now()) + 15000, total: r.total + 15 } : r));
              }}
            >
              +15 s
            </button>
            <button type="button" className="btn px-4" onClick={() => setRest(null)}>
              {remaining === 0 ? "Stäng" : "Hoppa över"}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="muted text-xs uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function summarize(exercises: SessionExerciseDTO[]) {
  let sets = 0;
  let volume = 0;
  for (const e of exercises) {
    for (const s of workingSets(e.sets)) {
      sets += 1;
      volume += (s.weightKg ?? 0) * (s.reps ?? 0);
    }
  }
  return { sets, volume };
}

// ----------------------------------------------------------------- inmatning

interface Inputs {
  weight: string;
  reps: string;
  seconds: string;
  meters: string;
  rpe: string;
  setType: SetType;
}

const EMPTY: Inputs = { weight: "", reps: "", seconds: "", meters: "", rpe: "", setType: "normal" };

const decimal = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** "90" eller "1:30" → sekunder. */
function duration(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const m = /^(\d+):([0-5]?\d)$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 && /^\d+$/.test(t) ? n : null;
}

function inputsFromSet(s: SetDTO): Inputs {
  return {
    weight: s.weightKg != null ? fmtNum(s.weightKg) : "",
    reps: s.reps?.toString() ?? "",
    seconds: s.durationSec != null ? fmtDuration(s.durationSec).replace(" s", "") : "",
    meters: s.distanceM?.toString() ?? "",
    rpe: s.rpe != null ? fmtNum(s.rpe, 1) : "",
    setType: s.setType,
  };
}

function parseInputs(i: Inputs, tracking: SessionExerciseDTO["tracking"]):
  | { ok: true; fields: Pick<SetDTO, "weightKg" | "reps" | "durationSec" | "distanceM" | "rpe" | "setType"> }
  | { ok: false; message: string } {
  const rpe = decimal(i.rpe);
  const base = { rpe: rpe != null && rpe >= 1 && rpe <= 10 ? rpe : null, setType: i.setType };
  const weight = decimal(i.weight);
  const reps = i.reps.trim() === "" ? null : Number.parseInt(i.reps, 10);
  switch (tracking) {
    case "weight_reps":
      if (weight == null) return { ok: false, message: "Ange vikt (0 om ingen)." };
      if (reps == null || !(reps >= 0)) return { ok: false, message: "Ange antal reps." };
      return { ok: true, fields: { ...base, weightKg: weight, reps, durationSec: null, distanceM: null } };
    case "reps_only":
      if (reps == null || !(reps >= 0)) return { ok: false, message: "Ange antal reps." };
      return { ok: true, fields: { ...base, weightKg: weight, reps, durationSec: null, distanceM: null } };
    case "time": {
      const sec = duration(i.seconds);
      if (sec == null) return { ok: false, message: "Ange tid i sekunder eller m:ss." };
      return { ok: true, fields: { ...base, weightKg: null, reps: null, durationSec: sec, distanceM: null } };
    }
    case "distance": {
      const m = i.meters.trim() === "" ? null : Number.parseInt(i.meters, 10);
      if (m == null || !(m >= 0)) return { ok: false, message: "Ange distans i meter." };
      const sec = duration(i.seconds);
      return { ok: true, fields: { ...base, weightKg: null, reps: null, durationSec: sec, distanceM: m } };
    }
  }
}

function errorText(code: unknown): string {
  switch (code) {
    case "session_closed":
      return "Passet är avbrutet.";
    case "set_number_taken":
      return "Setet finns redan — ladda om sidan.";
    case "invalid":
      return "Något värde är ogiltigt.";
    default:
      return "Kunde inte spara setet.";
  }
}

// ------------------------------------------------------------------ övningskort

function ExerciseCard({
  ex,
  sessionId,
  readOnly,
  showSupersetTag,
  supersetNext,
  startsGroup,
  onSets,
  onRest,
}: {
  ex: SessionExerciseDTO;
  sessionId: string;
  readOnly: boolean;
  showSupersetTag: boolean;
  supersetNext: string | null;
  startsGroup: boolean;
  onSets: (exerciseId: string, fn: (sets: SetDTO[]) => SetDTO[]) => void;
  onRest: (seconds: number, label: string) => void;
}) {
  const prevWork = ex.previous ? workingSets(ex.previous.sets) : [];
  const [inputs, setInputs] = useState<Inputs>(() => {
    // Första setet föreslås med förra passets första arbetsset.
    const seed = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1] : (prevWork[0] ?? null);
    return seed ? { ...inputsFromSet(seed), rpe: "", setType: "normal" } : EMPTY;
  });
  const [editing, setEditing] = useState<SetDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingId = useRef<string | null>(null);

  const done = workingSets(ex.sets).length;
  const nextNumber = ex.sets.reduce((m, s) => Math.max(m, s.setNumber), 0) + 1;
  const hint = !readOnly ? progressionHint(ex.previous, ex) : null;
  const best = bestOf(ex.sets, ex.tracking);
  const delta = ex.previous?.best ? bestScore(best, ex.tracking) - bestScore(ex.previous.best, ex.tracking) : null;

  const set = (patch: Partial<Inputs>) => setInputs((i) => ({ ...i, ...patch }));

  async function submit() {
    setError(null);
    const parsed = parseInputs(inputs, ex.tracking);
    if (!parsed.ok) return setError(parsed.message);
    setBusy(true);
    try {
      if (editing) {
        const res = await fetch(`/api/sessions/${sessionId}/sets/${editing.id}`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify(parsed.fields),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setError(errorText(data.error));
        onSets(ex.id, (sets) => sets.map((s) => (s.id === editing.id ? data.set : s)));
        setEditing(null);
        setInputs({ ...inputsFromSet(ex.sets[ex.sets.length - 1] ?? data.set), rpe: "", setType: "normal" });
        return;
      }

      // Samma clientId används om anropet misslyckas och användaren trycker igen.
      const clientId = (pendingId.current ??= crypto.randomUUID());
      const res = await fetch(`/api/sessions/${sessionId}/sets`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ sessionExerciseId: ex.id, clientId, ...parsed.fields }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(errorText(data.error));
      pendingId.current = null;
      onSets(ex.id, (sets) => (sets.some((s) => s.id === data.set.id) ? sets : [...sets, data.set]));
      setInputs((i) => ({ ...i, rpe: "", setType: "normal" }));
      // Superset: vila först efter sista övningen i gruppen.
      if (supersetNext) onRest(0, "");
      else if (parsed.fields.setType !== "warmup") onRest(ex.restSeconds, ex.name);
    } catch {
      setError("Ingen kontakt med servern — försök igen.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: SetDTO) {
    if (!confirm(`Ta bort set ${s.setNumber}?`)) return;
    const res = await fetch(`/api/sessions/${sessionId}/sets/${s.id}`, { method: "DELETE" });
    if (!res.ok) return setError("Kunde inte ta bort setet.");
    onSets(ex.id, (sets) => sets.filter((x) => x.id !== s.id));
    if (editing?.id === s.id) setEditing(null);
  }

  return (
    <section className="card flex flex-col gap-3">
      {startsGroup ? <p className="text-accent -mb-1 text-xs font-semibold uppercase tracking-wide">Superset</p> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/train/exercise/${ex.exerciseId}`} className="block text-lg font-semibold leading-tight">
            {ex.name}
          </Link>
          <p className="muted text-xs">
            Mål {fmtTarget(ex)}
            {showSupersetTag && supersetNext ? ` · sedan ${supersetNext}` : ""}
          </p>
        </div>
        <p className="muted shrink-0 text-sm tabular-nums">
          {done}/{ex.targetSets}
        </p>
      </div>

      {ex.previous ? (
        <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
          <p className="muted text-xs">Förra passet · {ex.previous.dateLabel}</p>
          <p className="tabular-nums">{ex.previous.sets.map((s) => fmtSet(s, ex.tracking)).join("  ·  ")}</p>
          {ex.previous.best && ex.tracking === "weight_reps" && ex.previous.best.e1rm ? (
            <p className="muted text-xs">Bäst: {fmtSet(ex.previous.best, ex.tracking)} (≈ {fmtNum(ex.previous.best.e1rm, 1)} kg 1RM)</p>
          ) : null}
          {hint ? (
            <p className={`mt-1 text-xs ${hint.kind === "up" ? "text-accent font-semibold" : "muted"}`}>{hint.text}</p>
          ) : null}
        </div>
      ) : !readOnly && hint ? (
        <p className="muted text-xs">{hint.text}</p>
      ) : null}

      {ex.sets.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {ex.sets.map((s) => {
            const prev = ex.previous?.sets.find((p) => p.setNumber === s.setNumber);
            const cmp = prev && s.setType !== "warmup" ? Math.sign(setScore(s, ex.tracking) - setScore(prev, ex.tracking)) : null;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => {
                    setEditing(s);
                    setInputs(inputsFromSet(s));
                    setError(null);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm ${
                    editing?.id === s.id ? "border-accent" : "border-line"
                  }`}
                >
                  <span className="tabular-nums">
                    <span className="muted mr-2">{s.setNumber}</span>
                    {fmtSet(s, ex.tracking)}
                    {s.setType === "warmup" ? <span className="muted ml-2 text-xs">uppvärmning</span> : null}
                    {s.setType === "dropset" ? <span className="muted ml-2 text-xs">dropset</span> : null}
                    {s.rpe != null ? <span className="muted ml-2 text-xs">RPE {fmtNum(s.rpe, 1)}</span> : null}
                  </span>
                  {cmp === 1 ? <span className="text-accent text-sm font-semibold">↑</span> : null}
                  {cmp === 0 ? <span className="muted text-sm">=</span> : null}
                  {cmp === -1 ? <span className="text-danger text-sm">↓</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {readOnly && delta != null && best ? (
        <p className={`text-xs ${delta > 0 ? "text-accent" : "muted"}`}>
          {delta > 0 ? "Framsteg" : delta === 0 ? "Samma som förra passet" : "Under förra passet"}
          {delta !== 0 ? ` · ${delta > 0 ? "+" : "−"}${fmtNum(Math.abs(delta), 1)}${ex.tracking === "weight_reps" ? " kg 1RM" : ex.tracking === "reps_only" ? " reps" : ex.tracking === "time" ? " s" : " m"}` : ""}
        </p>
      ) : null}

      {!readOnly ? (
        <div className="flex flex-col gap-2">
          <p className="muted text-xs">
            {editing
              ? `Ändrar set ${editing.setNumber}`
              : done >= ex.targetSets
                ? `Extra set ${nextNumber}`
                : `Set ${nextNumber} av ${ex.targetSets}`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ex.tracking === "weight_reps" || ex.tracking === "reps_only" ? (
              <>
                <NumberInput
                  label={ex.tracking === "reps_only" ? "Extra kg" : "Kilo"}
                  value={inputs.weight}
                  step={2.5}
                  onChange={(v) => set({ weight: v })}
                />
                <NumberInput label="Reps" value={inputs.reps} step={1} integer onChange={(v) => set({ reps: v })} />
              </>
            ) : null}
            {ex.tracking === "time" ? (
              <TextInput label="Tid (s eller m:ss)" value={inputs.seconds} onChange={(v) => set({ seconds: v })} />
            ) : null}
            {ex.tracking === "distance" ? (
              <>
                <NumberInput label="Meter" value={inputs.meters} step={100} integer onChange={(v) => set({ meters: v })} />
                <TextInput label="Tid (valfritt)" value={inputs.seconds} onChange={(v) => set({ seconds: v })} />
              </>
            ) : null}
          </div>

          <details className="text-sm">
            <summary className="muted cursor-pointer text-xs">Mer: typ av set och RPE</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs">
                <span className="muted">Typ</span>
                <select className="input" value={inputs.setType} onChange={(e) => set({ setType: e.target.value as SetType })}>
                  <option value="normal">Vanligt set</option>
                  <option value="warmup">Uppvärmning</option>
                  <option value="dropset">Dropset</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="muted">RPE (1–10)</span>
                <select className="input" value={inputs.rpe} onChange={(e) => set({ rpe: e.target.value })}>
                  <option value="">—</option>
                  {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((n) => (
                    <option key={n} value={String(n).replace(".", ",")}>
                      {fmtNum(n, 1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>

          {error ? <p className="text-danger text-xs">{error}</p> : null}

          <div className="flex gap-2">
            {editing ? (
              <>
                <button type="button" className="btn" onClick={() => remove(editing)} disabled={busy}>
                  Ta bort
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setEditing(null);
                    setError(null);
                  }}
                >
                  Avbryt
                </button>
              </>
            ) : null}
            <button type="button" className="btn btn-primary flex-1" onClick={submit} disabled={busy}>
              {busy ? "Sparar…" : editing ? "Spara ändring" : "Klart set"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function NumberInput({
  label,
  value,
  step,
  integer,
  onChange,
}: {
  label: string;
  value: string;
  step: number;
  integer?: boolean;
  onChange: (v: string) => void;
}) {
  const bump = (dir: 1 | -1) => {
    const base = decimal(value) ?? 0;
    onChange(fmtNum(Math.max(0, base + dir * step), 2));
  };
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="muted">{label}</span>
      <div className="flex items-stretch gap-1">
        <button type="button" className="btn h-12 w-10 px-0" onClick={() => bump(-1)} aria-label={`Minska ${label}`} tabIndex={-1}>
          −
        </button>
        <input
          className="input min-w-0 text-center text-lg font-semibold tabular-nums"
          style={{ minHeight: 48 }}
          inputMode={integer ? "numeric" : "decimal"}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(integer ? /[^\d]/g : /[^\d.,]/g, ""))}
        />
        <button type="button" className="btn h-12 w-10 px-0" onClick={() => bump(1)} aria-label={`Öka ${label}`} tabIndex={-1}>
          +
        </button>
      </div>
    </label>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="muted">{label}</span>
      <input
        className="input text-center text-lg font-semibold tabular-nums"
        style={{ minHeight: 48 }}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d:]/g, ""))}
      />
    </label>
  );
}
