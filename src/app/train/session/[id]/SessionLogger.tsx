"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import type { Key, TFn } from "@/lib/i18n/dictionaries";
import type { Formatters } from "@/lib/training/format";
import {
  bestOf,
  bestScore,
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
  const { t, tn, fmt, exName } = useI18n();
  const readOnly = initial.status !== "active";
  const [exercises, setExercises] = useState<SessionExerciseDTO[]>(initial.exercises);
  const [rest, setRest] = useState<Rest | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const beeped = useRef(false);

  // Offline/sync state from service worker
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    function onMessage(ev: MessageEvent) {
      const data = ev.data || {};
      switch (data.type) {
        case 'queue':
          setQueuedCount(typeof data.queued === 'number' ? data.queued : 0);
          if (data.queued === 0) {
            setSyncing(false);
            setSyncMessage('');
          }
          break;
        case 'sync-start':
          setSyncing(true);
          setSyncMessage(`Synkar… ${data.queued ?? ''}`);
          break;
        case 'sync-item':
          setSyncMessage(`Synkar ${data.url ?? ''}`);
          break;
        case 'sync-success':
          setSyncMessage('Synkat');
          break;
        case 'sync-failed':
          setSyncMessage(`Misslyckades: ${data.status ?? ''}`);
          break;
        case 'sync-giveup':
          setSyncMessage('Avbröt synk (för många försök)');
          break;
        case 'sync-network-error':
          setSyncMessage('Nätverket saknas — väntar');
          setSyncing(false);
          break;
        case 'sync-done':
          setQueuedCount(data.queued ?? 0);
          setSyncing(false);
          setSyncMessage(data.queued ? `Kvar: ${data.queued}` : 'Synkat');
          break;
        default:
          break;
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

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
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
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
      setFinishError(t("sess.err.noSets"));
      return;
    }
    const open = exercises.filter((e) => workingSets(e.sets).length < e.targetSets).length;
    if (open > 0 && !confirm(tn("sess.openConfirm", open))) return;
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
        setFinishError(data.error === "no_sets" ? t("sess.err.noSets") : t("sess.err.finish"));
        return;
      }
      router.refresh();
    } catch {
      setFinishError(t("common.noContact"));
    } finally {
      setFinishing(false);
    }
  }

  async function abandon() {
    if (!confirm(t("train.abandonConfirm"))) return;
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
  const allDone = exercises.every((e) => workingSets(e.sets).length >= e.targetSets);
  const minutes =
    initial.finishedAt != null
      ? Math.max(1, Math.round((Date.parse(initial.finishedAt) - Date.parse(initial.startedAt)) / 60000))
      : null;

  return (
    <main className={`mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-6 ${rest ? "pb-32" : "pb-10"}`}>
      <header className="flex items-center justify-between">
        <div>
          <p className="muted text-xs uppercase tracking-wide">
            {initial.status === "active"
              ? t("sess.ongoing")
              : initial.status === "done"
                ? t("sess.done")
                : t("sess.abandoned")}
          </p>
          <h1 className="text-2xl font-semibold">{initial.workoutName}</h1>
        </div>
        <Link className="btn px-4 py-2 text-sm" href="/train">
          {readOnly ? t("common.back") : t("common.overview")}
        </Link>
      </header>

      {initial.status === "done" ? (
        <section className="card grid grid-cols-3 gap-2 text-center">
          <Stat label={t("sess.time")} value={minutes ? t("sess.minutes", { n: minutes }) : "—"} />
          <Stat label={t("sess.sets")} value={String(totals.sets)} />
          <Stat label={t("sess.volume")} value={totals.volume > 0 ? `${fmt.num(totals.volume, 0)} kg` : "—"} />
        </section>
      ) : null}
      {initial.status === "abandoned" ? <p className="muted text-sm">{t("sess.abandonedNote")}</p> : null}

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
            supersetNext={nextInSuperset ? exName(nextInSuperset.name) : null}
            startsGroup={group != null && idx === 0}
            onSets={replaceSets}
            onRest={startRest}
          />
        );
      })}

      {!readOnly ? (
        <section className="flex flex-col gap-3">
          {finishError ? <p className="text-danger text-sm">{finishError}</p> : null}
          <button type="button" className={`btn ${allDone ? "btn-primary" : ""} w-full`} onClick={finish} disabled={finishing}>
            {finishing ? t("sess.finishing") : t("sess.finish")}
          </button>
          <button type="button" className="btn w-full" onClick={abandon} disabled={finishing}>
            {t("train.abandon")}
          </button>
        </section>
      ) : null}

      {rest ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="muted truncate text-xs">
                {remaining === 0 ? t("sess.restOver") : t("sess.rest", { name: rest.label })}
              </p>
              <p className={`text-3xl font-semibold tabular-nums ${remaining === 0 ? "text-accent" : ""}`}>
                {remaining === 0 ? t("sess.go") : fmt.duration(remaining)}
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
              {t("sess.plus15")}
            </button>
            <button type="button" className="btn px-4" onClick={() => setRest(null)}>
              {remaining === 0 ? t("common.close") : t("sess.skip")}
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

/** Tar både komma och punkt som decimaltecken, oavsett språk. */
const decimal = (s: string): number | null => {
  const text = s.trim().replace(",", ".");
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** "90" eller "1:30" → sekunder. */
function duration(s: string): number | null {
  const text = s.trim();
  if (text === "") return null;
  const m = /^(\d+):([0-5]?\d)$/.exec(text);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) && n >= 0 && /^\d+$/.test(text) ? n : null;
}

function inputsFromSet(s: SetDTO, fmt: Formatters): Inputs {
  return {
    weight: s.weightKg != null ? fmt.num(s.weightKg) : "",
    reps: s.reps?.toString() ?? "",
    seconds: s.durationSec != null ? fmt.duration(s.durationSec).replace(" s", "") : "",
    meters: s.distanceM?.toString() ?? "",
    rpe: s.rpe != null ? fmt.num(s.rpe, 1) : "",
    setType: s.setType,
  };
}

type Parsed =
  | { ok: true; fields: Pick<SetDTO, "weightKg" | "reps" | "durationSec" | "distanceM" | "rpe" | "setType"> }
  | { ok: false; message: Key };

function parseInputs(i: Inputs, tracking: SessionExerciseDTO["tracking"]): Parsed {
  const rpe = decimal(i.rpe);
  const base = { rpe: rpe != null && rpe >= 1 && rpe <= 10 ? rpe : null, setType: i.setType };
  const weight = decimal(i.weight);
  const reps = i.reps.trim() === "" ? null : Number.parseInt(i.reps, 10);
  switch (tracking) {
    case "weight_reps":
      if (weight == null) return { ok: false, message: "sess.err.weight" };
      if (reps == null || !(reps >= 0)) return { ok: false, message: "sess.err.reps" };
      return { ok: true, fields: { ...base, weightKg: weight, reps, durationSec: null, distanceM: null } };
    case "reps_only":
      if (reps == null || !(reps >= 0)) return { ok: false, message: "sess.err.reps" };
      return { ok: true, fields: { ...base, weightKg: weight, reps, durationSec: null, distanceM: null } };
    case "time": {
      const sec = duration(i.seconds);
      if (sec == null) return { ok: false, message: "sess.err.time" };
      return { ok: true, fields: { ...base, weightKg: null, reps: null, durationSec: sec, distanceM: null } };
    }
    case "distance": {
      const m = i.meters.trim() === "" ? null : Number.parseInt(i.meters, 10);
      if (m == null || !(m >= 0)) return { ok: false, message: "sess.err.meters" };
      const sec = duration(i.seconds);
      return { ok: true, fields: { ...base, weightKg: null, reps: null, durationSec: sec, distanceM: m } };
    }
  }
}

function errorText(t: TFn, code: unknown): string {
  switch (code) {
    case "session_closed":
      return t("sess.err.closed");
    case "set_number_taken":
      return t("sess.err.taken");
    case "invalid":
      return t("sess.err.invalid");
    default:
      return t("sess.err.save");
  }
}

// ------------------------------------------------------------------ övningskort

function ExerciseCard({
  ex,
  sessionId,
  readOnly,
  supersetNext,
  startsGroup,
  onSets,
  onRest,
}: {
  ex: SessionExerciseDTO;
  sessionId: string;
  readOnly: boolean;
  supersetNext: string | null;
  startsGroup: boolean;
  onSets: (exerciseId: string, fn: (sets: SetDTO[]) => SetDTO[]) => void;
  onRest: (seconds: number, label: string) => void;
}) {
  const { t, fmt, exName } = useI18n();
  const prevWork = ex.previous ? workingSets(ex.previous.sets) : [];
  const [inputs, setInputs] = useState<Inputs>(() => {
    // Första setet föreslås med förra passets första arbetsset.
    const seed = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1] : (prevWork[0] ?? null);
    return seed ? { ...inputsFromSet(seed, fmt), rpe: "", setType: "normal" } : EMPTY;
  });
  const [editing, setEditing] = useState<SetDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingId = useRef<string | null>(null);

  const name = exName(ex.name);
  const done = workingSets(ex.sets).length;
  const nextNumber = ex.sets.reduce((m, s) => Math.max(m, s.setNumber), 0) + 1;
  const hint = !readOnly ? progressionHint(ex.previous, ex) : null;
  const best = bestOf(ex.sets, ex.tracking);
  const delta = ex.previous?.best ? bestScore(best, ex.tracking) - bestScore(ex.previous.best, ex.tracking) : null;

  const hintText = hint
    ? hint.kind === "first"
      ? t("hint.first")
      : hint.kind === "up"
        ? t("hint.up", { top: hint.top, kg: fmt.num(hint.kg) })
        : hint.kind === "hold"
          ? t("hint.hold", { low: hint.low, kg: fmt.num(hint.kg) })
          : t("hint.reps")
    : null;

  const set = (patch: Partial<Inputs>) => setInputs((i) => ({ ...i, ...patch }));

  async function submit() {
    setError(null);
    const parsed = parseInputs(inputs, ex.tracking);
    if (!parsed.ok) return setError(t(parsed.message));
    setBusy(true);
    try {
      if (editing) {
        const res = await fetch(`/api/sessions/${sessionId}/sets/${editing.id}`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify(parsed.fields),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setError(errorText(t, data.error));
        onSets(ex.id, (sets) => sets.map((s) => (s.id === editing.id ? data.set : s)));
        setEditing(null);
        setInputs({ ...inputsFromSet(ex.sets[ex.sets.length - 1] ?? data.set, fmt), rpe: "", setType: "normal" });
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

      // 202 queued: service worker accepted the write and queued it locally
      if (res.status === 202 || data?.queued) {
        // show a local placeholder set (dedupe by clientId)
        const placeholder: any = {
          id: `pending-${clientId}`,
          clientId,
          setNumber: nextNumber,
          weightKg: (parsed.fields as any).weightKg ?? null,
          reps: (parsed.fields as any).reps ?? null,
          durationSec: (parsed.fields as any).durationSec ?? null,
          distanceM: (parsed.fields as any).distanceM ?? null,
          rpe: (parsed.fields as any).rpe ?? null,
          setType: (parsed.fields as any).setType ?? "normal",
          completedAt: new Date().toISOString(),
          pending: true,
        };
        onSets(ex.id, (sets) => {
          if (sets.some((s) => s.clientId === clientId || s.id === placeholder.id)) return sets;
          return [...sets, placeholder];
        });
        // keep pendingId so a manual retry (if user pressed again) reuses same clientId
        setInputs((i) => ({ ...i, rpe: "", setType: "normal" }));
        if (supersetNext) onRest(0, "");
        else if (parsed.fields.setType !== "warmup") onRest(ex.restSeconds, name);
        return;
      }

      if (!res.ok) return setError(errorText(t, data.error));

      // Success: integrate server-set and replace any placeholder with same clientId
      pendingId.current = null;
      const serverSet = data.set;
      onSets(ex.id, (sets) => {
        // if server returned clientId, replace placeholder
        if (serverSet?.clientId) {
          if (sets.some((s) => s.id === serverSet.id)) return sets;
          return sets.map((s) => (s.clientId === serverSet.clientId ? serverSet : s)).concat(sets.every((s) => s.id !== serverSet.id && s.clientId !== serverSet.clientId) ? [serverSet] : []);
        }
        return sets.some((s) => s.id === serverSet.id) ? sets : [...sets, serverSet];
      });
      setInputs((i) => ({ ...i, rpe: "", setType: "normal" }));
      // Superset: vila först efter sista övningen i gruppen.
      if (supersetNext) onRest(0, "");
      else if (parsed.fields.setType !== "warmup") onRest(ex.restSeconds, name);
    } catch {
      setError(t("common.noContactRetry"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: SetDTO) {
    if (!confirm(t("sess.deleteSetConfirm", { n: s.setNumber }))) return;
    const res = await fetch(`/api/sessions/${sessionId}/sets/${s.id}`, { method: "DELETE" });
    if (!res.ok) return setError(t("sess.err.delete"));
    // Numreringen på servern hålls sammanhängande; spegla det här utan att ladda om.
    onSets(ex.id, (sets) =>
      sets.filter((x) => x.id !== s.id).map((x) => (x.setNumber > s.setNumber ? { ...x, setNumber: x.setNumber - 1 } : x)),
    );
    if (editing?.id === s.id) setEditing(null);
  }

  return (
    <section className="card flex flex-col gap-3">
      {startsGroup ? (
        <p className="text-accent -mb-1 text-xs font-semibold uppercase tracking-wide">{t("sess.superset")}</p>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/train/exercise/${ex.exerciseId}`} className="block text-lg font-semibold leading-tight">
            {name}
          </Link>
          <p className="muted text-xs">
            {t("sess.target", { target: fmt.target(ex) })}
            {supersetNext ? ` · ${t("sess.then", { name: supersetNext })}` : ""}
          </p>
        </div>
        <p className="muted shrink-0 text-sm tabular-nums">
          {done}/{ex.targetSets}
        </p>
      </div>

      {ex.previous ? (
        <PrevBox previous={ex.previous} tracking={ex.tracking} hintText={hintText} fmt={fmt} t={t} />
      ) : !readOnly && hintText ? (
        <p className="muted text-xs">{hintText}</p>
      ) : null}

      


      {ex.sets.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {ex.sets.map((s) => {
            const prev = ex.previous?.sets.find((p) => p.setNumber === s.setNumber);
            const cmp =
              prev && s.setType !== "warmup" ? Math.sign(setScore(s, ex.tracking) - setScore(prev, ex.tracking)) : null;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => {
                    setEditing(s);
                    setInputs(inputsFromSet(s, fmt));
                    setError(null);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm ${
                    editing?.id === s.id ? "border-accent" : "border-line"
                  }`}
                >
                  <span className="tabular-nums">
                    <span className="muted mr-2">{s.setNumber}</span>
                    {fmt.set(s, ex.tracking)}
                    {s.setType === "warmup" ? <span className="muted ml-2 text-xs">{t("sess.warmup")}</span> : null}
                    {s.setType === "dropset" ? <span className="muted ml-2 text-xs">{t("sess.dropset")}</span> : null}
                    {s.rpe != null ? (
                      <span className="muted ml-2 text-xs">{t("sess.rpe", { n: fmt.num(s.rpe, 1) })}</span>
                    ) : null}
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
          {delta > 0 ? t("sess.progress") : delta === 0 ? t("sess.same") : t("sess.below")}
          {delta !== 0
            ? ` · ${delta > 0 ? "+" : "−"}${fmt.num(Math.abs(delta), 1)} ${t(`sess.unit.${ex.tracking}` as Key)}`
            : ""}
        </p>
      ) : null}

      {!readOnly ? (
        <div className="flex flex-col gap-2">
          <p className="muted text-xs">
            {editing
              ? t("sess.editing", { n: editing.setNumber })
              : done >= ex.targetSets
                ? t("sess.extra", { n: nextNumber })
                : t("sess.setOf", { n: nextNumber, total: ex.targetSets })}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ex.tracking === "weight_reps" || ex.tracking === "reps_only" ? (
              <>
                <NumberInput
                  label={ex.tracking === "reps_only" ? t("sess.extraKg") : t("sess.kg")}
                  value={inputs.weight}
                  step={2.5}
                  onChange={(v) => set({ weight: v })}
                />
                <NumberInput label={t("sess.reps")} value={inputs.reps} step={1} integer onChange={(v) => set({ reps: v })} />
              </>
            ) : null}
            {ex.tracking === "time" ? (
              <TextInput label={t("sess.timeInput")} value={inputs.seconds} onChange={(v) => set({ seconds: v })} />
            ) : null}
            {ex.tracking === "distance" ? (
              <>
                <NumberInput label={t("sess.meters")} value={inputs.meters} step={100} integer onChange={(v) => set({ meters: v })} />
                <TextInput label={t("sess.timeOptional")} value={inputs.seconds} onChange={(v) => set({ seconds: v })} />
              </>
            ) : null}
          </div>

          <details className="text-sm">
            <summary className="muted cursor-pointer text-xs">{t("sess.more")}</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs">
                <span className="muted">{t("sess.type")}</span>
                <select className="input" value={inputs.setType} onChange={(e) => set({ setType: e.target.value as SetType })}>
                  <option value="normal">{t("sess.typeNormal")}</option>
                  <option value="warmup">{t("sess.typeWarmup")}</option>
                  <option value="dropset">{t("sess.typeDrop")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="muted">{t("sess.rpeLabel")}</span>
                <select className="input" value={inputs.rpe} onChange={(e) => set({ rpe: e.target.value })}>
                  <option value="">—</option>
                  {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((n) => (
                    <option key={n} value={fmt.num(n, 1)}>
                      {fmt.num(n, 1)}
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
                  {t("common.remove")}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setEditing(null);
                    setError(null);
                  }}
                >
                  {t("common.cancel")}
                </button>
              </>
            ) : null}
            <button type="button" className="btn btn-primary flex-1" onClick={submit} disabled={busy}>
              {busy ? t("common.saving") : editing ? t("sess.saveChange") : t("sess.logSet")}
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
  const { t, fmt } = useI18n();
  const bump = (dir: 1 | -1) => {
    const base = decimal(value) ?? 0;
    onChange(fmt.num(Math.max(0, base + dir * step), 2));
  };
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="muted">{label}</span>
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          className="btn h-12 w-10 px-0"
          onClick={() => bump(-1)}
          aria-label={t("sess.decrease", { label })}
          tabIndex={-1}
        >
          −
        </button>
        <input
          className="input min-w-0 text-center text-lg font-semibold tabular-nums"
          style={{ minHeight: 48 }}
          inputMode={integer ? "numeric" : "decimal"}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(integer ? /[^\d]/g : /[^\d.,]/g, ""))}
        />
        <button
          type="button"
          className="btn h-12 w-10 px-0"
          onClick={() => bump(1)}
          aria-label={t("sess.increase", { label })}
          tabIndex={-1}
        >
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

function PrevBox({ previous, tracking, hintText, fmt, t }: { previous: { sets: SetDTO[]; dateLabel: string; best?: any }; tracking: any; hintText: string | null; fmt: any; t: any }) {
  const [open, setOpen] = useState(false);
  const compact = previous.sets.map((s) => fmt.set(s, tracking)).join("  ·  ");
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="muted text-xs">{t("sess.prev", { date: previous.dateLabel })}</p>
          <p className="tabular-nums">{compact}</p>
          {previous.best && tracking === "weight_reps" && previous.best.e1rm ? (
            <p className="muted text-xs">
              {t("sess.best", { set: fmt.set(previous.best, tracking), e1rm: fmt.num(previous.best.e1rm, 1) })}
            </p>
          ) : null}
          {hintText ? <p className={`mt-1 text-xs muted`}>{hintText}</p> : null}
        </div>
        <button type="button" className="btn px-3" onClick={() => setOpen((s) => !s)}>
          {open ? t("common.hide") : t("common.showMore")}
        </button>
      </div>
      {open ? (
        <div className="mt-2 text-sm">
          {previous.sets.map((s) => (
            <div key={s.clientId ?? s.id} className="flex items-center justify-between">
              <div className="tabular-nums">{fmt.set(s, tracking)}</div>
              <div className="muted text-xs">{s.completedAt}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
