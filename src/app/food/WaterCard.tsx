"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/** Vatten per dag: snabbknappar, summan sparas direkt på servern. */
export function WaterCard({ date, ml: initial, target }: { date: string; ml: number; target: number }) {
  const { t } = useI18n();
  const [ml, setMl] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function add(delta: number) {
    setBusy(true);
    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, deltaMl: delta }),
      });
      if (res.ok) setMl((await res.json()).ml);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="muted text-xs uppercase tracking-wide">{t("water.title")}</p>
        <p className="text-sm tabular-nums">{t("water.of", { ml, target })}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={ml}>
        <div className="h-full bg-accent transition-all" style={{ width: `${Math.min(100, (ml / Math.max(1, target)) * 100)}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" className="btn px-0 text-sm" disabled={busy || ml <= 0} onClick={() => add(-250)}>
          {t("water.sub", { n: 250 })}
        </button>
        <button type="button" className="btn px-0 text-sm" disabled={busy} onClick={() => add(250)}>
          {t("water.add", { n: 250 })}
        </button>
        <button type="button" className="btn px-0 text-sm" disabled={busy} onClick={() => add(500)}>
          {t("water.add", { n: 500 })}
        </button>
      </div>
    </section>
  );
}
