"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FoodDTO } from "@/lib/food/types";
import { useI18n } from "@/lib/i18n/client";

const num = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

/** Eget livsmedel: skapa eller ändra. Värden per 100 g. Ändringar rör inte redan loggade poster. */
export function FoodForm({
  food,
  back,
  prefill,
}: {
  food?: FoodDTO;
  back: string;
  prefill?: { barcode?: string | null; name?: string | null };
}) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const f = (n: number | null | undefined) => (n == null ? "" : fmt.num(n));
  const [v, setV] = useState({
    name: food?.name ?? prefill?.name ?? "",
    brand: food?.brand ?? "",
    kcal: f(food?.kcal100g),
    protein: f(food?.protein100g),
    carbs: f(food?.carbs100g),
    fat: f(food?.fat100g),
    serving: f(food?.servingGrams),
    servingLabel: food?.servingLabel ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof v, value: string) => setV((s) => ({ ...s, [k]: value }));

  async function save() {
    const kcal = num(v.kcal);
    const [protein, carbs, fat] = [num(v.protein) ?? 0, num(v.carbs) ?? 0, num(v.fat) ?? 0];
    const serving = num(v.serving);
    if (!v.name.trim()) return setError(t("foodform.err.name"));
    if (kcal == null || Number.isNaN(kcal) || kcal < 0 || kcal > 1000) return setError(t("foodform.err.kcal"));
    if ([protein, carbs, fat].some((x) => Number.isNaN(x) || x < 0 || x > 100)) return setError(t("foodform.err.macro"));
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(food ? `/api/foods/${food.id}` : "/api/foods", {
        method: food ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: v.name.trim(),
          brand: v.brand.trim() || null,
          barcode: food?.barcode ?? prefill?.barcode ?? null,
          kcal100g: kcal,
          protein100g: protein,
          carbs100g: carbs,
          fat100g: fat,
          servingGrams: serving != null && !Number.isNaN(serving) && serving > 0 ? serving : null,
          servingLabel: v.servingLabel.trim() || null,
        }),
      });
      if (!res.ok) return setError(res.status === 409 ? t("foodform.err.barcode") : t("foodform.err.save"));
      router.push(back);
      router.refresh();
    } catch {
      setError(t("common.noContact"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!food || !confirm(t("foodform.deleteConfirm", { name: food.name }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/foods/${food.id}`, { method: "DELETE" });
      if (!res.ok) return setError(t("foodform.err.save"));
      router.push(back);
      router.refresh();
    } catch {
      setError(t("common.noContact"));
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof typeof v, label: string, mode: "text" | "decimal" = "decimal") => (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="muted text-xs">{label}</span>
      <input
        className="input"
        inputMode={mode}
        value={v[key]}
        onChange={(e) => set(key, mode === "decimal" ? e.target.value.replace(/[^\d.,]/g, "") : e.target.value)}
      />
    </label>
  );

  return (
    <div className="card flex flex-col gap-4">
      <p className="muted text-xs">{t("foodform.private")}</p>
      {(food?.barcode ?? prefill?.barcode) ? (
        <p className="text-sm tabular-nums">{t("foodform.barcode", { code: (food?.barcode ?? prefill?.barcode) as string })}</p>
      ) : null}
      {field("name", t("foodform.name"), "text")}
      {field("brand", t("foodform.brand"), "text")}
      <p className="muted text-xs uppercase tracking-wide">{t("foodform.per100")}</p>
      <div className="grid grid-cols-2 gap-3">
        {field("kcal", t("foodform.kcal"))}
        {field("protein", t("foodform.protein"))}
        {field("carbs", t("foodform.carbs"))}
        {field("fat", t("foodform.fat"))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("serving", t("foodform.serving"))}
        {field("servingLabel", t("foodform.servingLabel"), "text")}
      </div>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <button type="button" className="btn btn-primary w-full" onClick={save} disabled={busy}>
        {busy ? t("common.saving") : t("foodform.save")}
      </button>
      {food ? (
        <button type="button" className="btn border-danger/40 text-danger w-full" onClick={remove} disabled={busy}>
          {t("foodform.delete")}
        </button>
      ) : null}
    </div>
  );
}
