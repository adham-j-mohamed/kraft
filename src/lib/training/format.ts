/**
 * Språkmedveten formatering av tal, tider, set och mål. Klientsäker — används av
 * både serverkomponenter och klientkomponenter.
 */
import type { TFn, TnFn } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";
import type { SessionExerciseDTO, SetDTO, Tracking } from "./types";

type SetLike = Pick<SetDTO, "weightKg" | "reps" | "durationSec" | "distanceM">;
type TargetLike = Pick<
  SessionExerciseDTO,
  "tracking" | "targetSets" | "targetRepsLow" | "targetRepsHigh" | "targetSeconds" | "targetMeters"
>;

export function makeFormatters(locale: Locale, t: TFn, tn: TnFn) {
  /** 62.5 → "62,5" (sv) eller "62.5" (en). Avrundar till `decimals` decimaler. */
  const num = (n: number, decimals = 2): string => {
    const rounded = Math.round(n * 10 ** decimals) / 10 ** decimals;
    const text = String(rounded);
    return locale === "sv" ? text.replace(".", ",") : text;
  };

  const duration = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s} s`;
  };

  const set = (s: SetLike, tracking: Tracking): string => {
    switch (tracking) {
      case "weight_reps":
        return `${s.weightKg != null ? num(s.weightKg) : "0"} kg × ${s.reps ?? 0}`;
      case "reps_only":
        return s.weightKg
          ? `${s.reps ?? 0} ${t("fmt.reps")} ${t("fmt.extraKg", { kg: num(s.weightKg) })}`
          : `${s.reps ?? 0} ${t("fmt.reps")}`;
      case "time":
        return duration(s.durationSec ?? 0);
      case "distance":
        return s.durationSec
          ? t("fmt.distanceIn", { m: s.distanceM ?? 0, time: duration(s.durationSec) })
          : `${s.distanceM ?? 0} m`;
    }
  };

  const target = (x: TargetLike): string => {
    const sets = `${x.targetSets} ×`;
    const fallback = tn("fmt.sets", x.targetSets);
    switch (x.tracking) {
      case "weight_reps":
      case "reps_only": {
        if (x.targetRepsLow && x.targetRepsHigh && x.targetRepsLow !== x.targetRepsHigh) {
          return `${sets} ${x.targetRepsLow}–${x.targetRepsHigh}`;
        }
        const reps = x.targetRepsHigh ?? x.targetRepsLow;
        return reps ? `${sets} ${reps}` : fallback;
      }
      case "time":
        return x.targetSeconds ? `${sets} ${duration(x.targetSeconds)}` : fallback;
      case "distance":
        return x.targetMeters ? `${sets} ${x.targetMeters} m` : fallback;
    }
  };

  return { num, duration, set, target };
}

export type Formatters = ReturnType<typeof makeFormatters>;
