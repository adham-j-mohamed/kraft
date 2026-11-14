"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Sparkline } from "../Sparkline";

/** Vikt: en vägning per dag, snitt över sju dagar och förändring mot veckan innan. */
export function WeightCard({
  date,
  weightKg,
  last,
  avg7,
  delta,
  points,
}: {
  date: string;
  weightKg: number | null;
  last: number | null;
  avg7: number | null;
  delta: number | null;
  points: number[];
}) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState(weightKg != null ? fmt.num(weightKg, 1) : last != null ? fmt.num(last, 1) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const kg = Number(value.replace(",", "."));
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) return setError(t("weight.err"));
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, weightKg: kg }),
      });
      if (!res.ok) return setError(t("food.err.save"));
      router.refresh();
    } catch {
      setError(t("common.noContact"));
    } finally {
      setBusy(false);
    }
  }

  const sign = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt.num(Math.abs(n), 1)}`;

  return (
    <section className="card flex flex-col gap-3">
      <p className="muted text-xs uppercase tracking-wide">{t("weight.title")}</p>
      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs">
          <span className="muted">{t("weight.input")}</span>
          <input className="input" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.,]/g, ""))} />
        </label>
        <button type="button" className="btn btn-primary px-5" onClick={save} disabled={busy}>
          {t("weight.save")}
        </button>
      </div>
      {error ? <p className="text-danger text-xs">{error}</p> : null}
      {avg7 != null ? (
        <p className="text-sm">
          {t("weight.trend", { kg: fmt.num(avg7, 1) })}
          {delta != null ? <span className="muted"> · {t("weight.change", { delta: sign(delta) })}</span> : null}
        </p>
      ) : last == null ? (
        <p className="muted text-sm">{t("weight.none")}</p>
      ) : null}
      {points.length >= 2 ? <Sparkline points={points} label={t("weight.chart")} /> : null}
    </section>
  );
}
