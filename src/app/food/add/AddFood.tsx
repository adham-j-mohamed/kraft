"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MEALS, type FoodDTO, type Meal } from "@/lib/food/types";
import { useI18n } from "@/lib/i18n/client";
import { foodLabel, servingLabelText } from "@/lib/i18n/foods";
import { scalePer100g } from "@/lib/nutrition";
import { BarcodeScanner } from "./BarcodeScanner";

const JSON_HEADERS = { "content-type": "application/json" };
type Tab = "recent" | "favorites";

/** Sök, välj livsmedel, välj mängd, lägg till. Det vanligaste ligger under "Senast" och "Favoriter". */
export function AddFood({ meal: initialMeal, date }: { meal: Meal; date: string }) {
  const { t, locale, fmt } = useI18n();
  const router = useRouter();
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodDTO[] | null>(null);
  const [recent, setRecent] = useState<FoodDTO[]>([]);
  const [favorites, setFavorites] = useState<FoodDTO[]>([]);
  const [tab, setTab] = useState<Tab>("recent");
  const [selected, setSelected] = useState<FoodDTO | null>(null);
  const [unit, setUnit] = useState<"g" | "serv">("g");
  const [amount, setAmount] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingId = useRef<string | null>(null);

  const [scanOpen, setScanOpen] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  type Lookup =
    | { state: "idle" }
    | { state: "busy"; code: string }
    | { state: "notFound" | "noNutrition" | "failed" | "rate"; code: string; name?: string | null };
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });

  const [quickOpen, setQuickOpen] = useState(false);
  const [quick, setQuick] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  const [quickError, setQuickError] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    try {
      const res = await fetch("/api/foods/recent", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRecent(data.recent);
      setFavorites(data.favorites);
    } catch {
      /* listorna är en bekvämlighet */
    }
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods?q=${encodeURIComponent(q.trim())}`, { signal: controller.signal });
        if (res.ok) setResults((await res.json()).foods);
      } catch {
        /* avbruten eller offline */
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  function pick(food: FoodDTO, note: string | null = null) {
    pendingId.current = null;
    setScanNote(note);
    setError(null);
    setSelected(food);
    if (food.servingGrams) {
      setUnit("serv");
      setAmount("1");
    } else {
      setUnit("g");
      setAmount("100");
    }
  }

  const amountNum = Number(amount.replace(",", "."));
  const grams = selected
    ? unit === "serv" && selected.servingGrams
      ? amountNum * selected.servingGrams
      : amountNum
    : 0;
  const preview =
    selected && Number.isFinite(grams) && grams > 0
      ? scalePer100g(
          { kcal: selected.kcal100g, protein: selected.protein100g, carbs: selected.carbs100g, fat: selected.fat100g },
          grams,
        )
      : null;

  /** Streckkod → livsmedel. Hittas det öppnas portionsvalet; annars förklaras varför och vad man kan göra. */
  async function lookupCode(code: string) {
    setLookup({ state: "busy", code });
    try {
      const res = await fetch(`/api/foods/barcode/${code}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLookup({ state: "idle" });
        setScanOpen(false);
        pick(data.food as FoodDTO, t("scan.fromCode", { code }));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setScanOpen(false);
      if (res.status === 404 && data.error === "no_nutrition") return setLookup({ state: "noNutrition", code, name: data.name ?? null });
      if (res.status === 404) return setLookup({ state: "notFound", code });
      if (res.status === 429) return setLookup({ state: "rate", code });
      setLookup({ state: "failed", code });
    } catch {
      setScanOpen(false);
      setLookup({ state: "failed", code });
    }
  }

  async function toggleFavorite(food: FoodDTO) {
    const on = !food.favorite;
    const update = (list: FoodDTO[]) => list.map((f) => (f.id === food.id ? { ...f, favorite: on } : f));
    setResults((r) => (r ? update(r) : r));
    setRecent(update);
    setFavorites((f) => (on ? [{ ...food, favorite: true }, ...f.filter((x) => x.id !== food.id)] : f.filter((x) => x.id !== food.id)));
    setSelected((s) => (s && s.id === food.id ? { ...s, favorite: on } : s));
    try {
      await fetch(`/api/foods/${food.id}/favorite`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ on }) });
    } catch {
      void loadLists();
    }
  }

  async function log() {
    if (!selected) return;
    if (!preview) return setError(t("portion.amountErr"));
    setBusy(true);
    setError(null);
    try {
      // Samma clientId vid nytt försök, så ett omsänt anrop aldrig ger två poster.
      const clientId = (pendingId.current ??= crypto.randomUUID());
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          date,
          meal,
          clientId,
          foodId: selected.id,
          ...(unit === "serv" ? { servings: amountNum } : { grams: amountNum }),
        }),
      });
      if (!res.ok) return setError(t("portion.err"));
      router.push(`/food?d=${date}`);
      router.refresh();
    } catch {
      setError(t("common.noContactRetry"));
    } finally {
      setBusy(false);
    }
  }

  async function logQuick() {
    const kcal = Number(quick.kcal.replace(",", "."));
    if (!quick.name.trim() || !Number.isFinite(kcal) || kcal < 0) return setQuickError(t("add.quickErr"));
    const n = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(",", ".")));
    setBusy(true);
    setQuickError(null);
    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          date,
          meal,
          clientId: crypto.randomUUID(),
          quick: { name: quick.name.trim(), kcal, protein: n(quick.protein), carbs: n(quick.carbs), fat: n(quick.fat) },
        }),
      });
      if (!res.ok) return setQuickError(t("portion.err"));
      router.push(`/food?d=${date}`);
      router.refresh();
    } catch {
      setQuickError(t("common.noContactRetry"));
    } finally {
      setBusy(false);
    }
  }

  const list = q.trim() ? results : tab === "recent" ? recent : favorites;
  const listTitle = q.trim() ? t("add.results") : tab === "recent" ? t("add.recent") : t("add.favorites");
  const emptyText = q.trim() ? t("add.noMatch") : tab === "recent" ? t("add.emptyRecent") : t("add.emptyFavorites");
  const query = `meal=${meal}&d=${date}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={t("add.meal")}>
        {MEALS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMeal(m)}
            aria-pressed={meal === m}
            className={`btn min-h-11 px-1 text-xs ${meal === m ? "btn-primary" : ""}`}
          >
            {t(`meal.${m}` as const)}
          </button>
        ))}
      </div>

      {scanOpen ? (
        <BarcodeScanner onCode={lookupCode} onClose={() => setScanOpen(false)} busy={lookup.state === "busy"} />
      ) : (
        <button
          type="button"
          className="btn btn-primary w-full gap-3"
          onClick={() => {
            setLookup({ state: "idle" });
            setScanOpen(true);
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M11 8v8M15 8v8M18 8v8" />
          </svg>
          {t("scan.button")}
        </button>
      )}

      {lookup.state === "busy" ? (
        <p className="muted text-sm" role="status">
          {t("scan.looking", { code: lookup.code })}
        </p>
      ) : lookup.state !== "idle" ? (
        <section className="card border-danger/40 flex flex-col gap-3" role="alert">
          <p className="text-sm">
            {lookup.state === "notFound"
              ? t("scan.notFound", { code: lookup.code })
              : lookup.state === "noNutrition"
                ? t("scan.noNutrition", { name: lookup.name || lookup.code })
                : lookup.state === "rate"
                  ? t("scan.rate")
                  : t("scan.lookupFailed")}
          </p>
          {lookup.state === "notFound" || lookup.state === "noNutrition" ? (
            <Link
              className="btn btn-primary w-full"
              href={`/food/new?${query}&barcode=${lookup.code}${lookup.state === "noNutrition" && lookup.name ? `&name=${encodeURIComponent(lookup.name)}` : ""}`}
            >
              {t("scan.createWith")}
            </Link>
          ) : (
            <button type="button" className="btn btn-primary w-full" onClick={() => lookupCode(lookup.code)}>
              {t("scan.retry")}
            </button>
          )}
          <button type="button" className="btn w-full" onClick={() => { setLookup({ state: "idle" }); setScanOpen(true); }}>
            {t("scan.again")}
          </button>
        </section>
      ) : null}

      <input
        className="input"
        type="search"
        placeholder={t("add.search")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
        autoCapitalize="none"
      />

      {selected ? (
        <section className="card border-accent/50 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-tight">{foodLabel(selected.name, locale)}</p>
              <p className="muted text-xs">
                {selected.brand ? `${selected.brand} · ` : ""}
                {t("add.per100", { kcal: fmt.num(selected.kcal100g, 0) })}
              </p>
              {scanNote ? <p className="text-accent text-xs font-medium">{scanNote}</p> : null}
              {selected.source === "off" ? <p className="muted text-[11px]">{t("scan.source.off")}</p> : null}
            </div>
            <button type="button" className="btn h-9 min-h-0 px-3 text-xs" onClick={() => setSelected(null)}>
              {t("portion.close")}
            </button>
          </div>

          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs">
              <span className="muted">{t("portion.amount")}</span>
              <input
                className="input text-center text-lg font-semibold tabular-nums"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              />
            </label>
            <div className="grid grid-cols-2 gap-1.5" role="group">
              <button type="button" aria-pressed={unit === "g"} className={`btn min-h-12 px-3 text-sm ${unit === "g" ? "btn-primary" : ""}`} onClick={() => { setUnit("g"); if (unit === "serv" && preview) setAmount(fmt.num(grams, 0)); }}>
                {t("portion.grams")}
              </button>
              {selected.servingGrams ? (
                <button type="button" aria-pressed={unit === "serv"} className={`btn min-h-12 px-3 text-sm ${unit === "serv" ? "btn-primary" : ""}`} onClick={() => { setUnit("serv"); setAmount("1"); }}>
                  {t("portion.servings")}
                </button>
              ) : null}
            </div>
          </div>
          {selected.servingGrams ? (
            <p className="muted text-xs">
              {servingLabelText(selected.servingLabel, locale)
                ? `${servingLabelText(selected.servingLabel, locale)} ≈ ${fmt.num(selected.servingGrams, 0)} g`
                : t("portion.serving", { g: fmt.num(selected.servingGrams, 0) })}
            </p>
          ) : null}

          <p className="text-sm tabular-nums" aria-live="polite">
            {preview ? (
              <>
                <strong className="text-lg">{fmt.num(preview.kcal, 0)} kcal</strong>
                <span className="muted">
                  {" · "}
                  {t("food.macroShort", { p: fmt.num(preview.protein, 0), c: fmt.num(preview.carbs, 0), f: fmt.num(preview.fat, 0) })}
                </span>
              </>
            ) : (
              <span className="muted">—</span>
            )}
          </p>

          {error ? <p className="text-danger text-xs">{error}</p> : null}
          <button type="button" className="btn btn-primary w-full" onClick={log} disabled={busy}>
            {busy ? t("portion.logging") : t("portion.log", { meal: t(`meal.${meal}` as const) })}
          </button>
          {selected.own ? (
            <Link className="btn w-full" href={`/food/${selected.id}?${query}`}>
              {t("portion.edit")}
            </Link>
          ) : null}
        </section>
      ) : null}

      {!q.trim() ? (
        <div className="grid grid-cols-2 gap-1.5" role="group">
          {(["recent", "favorites"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)} className={`btn min-h-11 text-sm ${tab === k ? "btn-primary" : ""}`}>
              {k === "recent" ? t("add.recent") : t("add.favorites")}
            </button>
          ))}
        </div>
      ) : null}

      <section className="card flex flex-col gap-1">
        <p className="muted text-xs uppercase tracking-wide">{listTitle}</p>
        {list === null ? (
          <p className="muted text-sm">{t("common.loading")}</p>
        ) : list.length === 0 ? (
          <p className="muted text-sm">{emptyText}</p>
        ) : (
          <ul className="flex flex-col">
            {list.map((f) => (
              <li key={f.id} className="flex items-center gap-1 border-b border-line last:border-0">
                <button type="button" className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2.5 text-left" onClick={() => pick(f)}>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{foodLabel(f.name, locale)}</span>
                    <span className="muted block truncate text-xs">
                      {f.brand ? `${f.brand} · ` : ""}
                      {t("add.per100", { kcal: fmt.num(f.kcal100g, 0) })}
                    </span>
                  </span>
                  <span className="text-accent shrink-0 text-xl" aria-hidden="true">+</span>
                </button>
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-xl"
                  aria-pressed={f.favorite}
                  aria-label={f.favorite ? t("add.unfavorite") : t("add.favorite")}
                  onClick={() => toggleFavorite(f)}
                >
                  <span className={f.favorite ? "text-accent" : "muted"}>{f.favorite ? "★" : "☆"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link className="btn w-full" href={`/food/new?${query}`}>
        {t("add.createOwn")}
      </Link>

      <section className="card flex flex-col gap-3">
        <button type="button" className="text-left text-sm font-medium" onClick={() => setQuickOpen((v) => !v)} aria-expanded={quickOpen}>
          {quickOpen ? "▾" : "▸"} {t("add.quick")}
        </button>
        {quickOpen ? (
          <>
            <p className="muted text-xs">{t("add.quickHint")}</p>
            <input className="input" placeholder={t("add.quickName")} value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["kcal", "add.quickKcal"],
                  ["protein", "add.quickProtein"],
                  ["carbs", "add.quickCarbs"],
                  ["fat", "add.quickFat"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex flex-col gap-1 text-xs">
                  <span className="muted">{t(label)}</span>
                  <input className="input" inputMode="decimal" value={quick[key]} onChange={(e) => setQuick({ ...quick, [key]: e.target.value.replace(/[^\d.,]/g, "") })} />
                </label>
              ))}
            </div>
            {quickError ? <p className="text-danger text-xs">{quickError}</p> : null}
            <button type="button" className="btn btn-primary w-full" onClick={logQuick} disabled={busy}>
              {t("add.quickBtn")}
            </button>
          </>
        ) : null}
      </section>
    </div>
  );
}
