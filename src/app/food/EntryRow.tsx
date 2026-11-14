"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

export interface EntryView {
  id: string;
  label: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** En loggad post. Tryck för att ändra mängden (värdena skalas) eller ta bort den. */
export function EntryRow({ entry }: { entry: EntryView }) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const quick = entry.grams <= 0;
  const [open, setOpen] = useState(false);
  const [grams, setGrams] = useState(fmt.num(entry.grams));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const n = Number(grams.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return setError(t("portion.amountErr"));
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/diary/${entry.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ grams: n }),
      });
      if (!res.ok) return setError(t("food.err.save"));
      setOpen(false);
      router.refresh();
    } catch {
      setError(t("common.noContact"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(t("food.deleteConfirm", { name: entry.label }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/diary/${entry.id}`, { method: "DELETE" });
      if (!res.ok) return setError(t("food.err.save"));
      router.refresh();
    } catch {
      setError(t("common.noContact"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border-b border-line last:border-0">
      <button type="button" className="flex w-full items-center justify-between gap-3 py-2.5 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="min-w-0">
          <span className="block truncate font-medium">{entry.label}</span>
          <span className="muted block text-xs tabular-nums">
            {quick ? t("food.quickTag") : `${fmt.num(entry.grams, 0)} g`} · {t("food.macroShort", { p: fmt.num(entry.protein, 0), c: fmt.num(entry.carbs, 0), f: fmt.num(entry.fat, 0) })}
          </span>
        </span>
        <span className="shrink-0 tabular-nums">{fmt.num(entry.kcal, 0)} kcal</span>
      </button>
      {open ? (
        <div className="flex flex-col gap-2 pb-3">
          {quick ? null : (
            <label className="flex items-end gap-2 text-xs">
              <span className="flex flex-1 flex-col gap-1">
                <span className="muted">{t("food.amountG")}</span>
                <input className="input" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value.replace(/[^\d.,]/g, ""))} />
              </span>
              <button type="button" className="btn btn-primary px-5" onClick={save} disabled={busy}>
                {t("food.save")}
              </button>
            </label>
          )}
          {error ? <p className="text-danger text-xs">{error}</p> : null}
          <button type="button" className="btn border-danger/40 text-danger" onClick={remove} disabled={busy}>
            {t("common.remove")}
          </button>
        </div>
      ) : null}
    </li>
  );
}
