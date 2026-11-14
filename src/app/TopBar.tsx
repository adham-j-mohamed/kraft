"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { LANG_COOKIE, LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/locales";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Fält längst upp på alla sidor: språkval, och för admin en ringklocka som visar hur
 * många konton som väntar på godkännande. Språket följer enheten tills man väljer
 * själv; "Auto" tar bort det egna valet igen.
 */
export function TopBar({
  explicit,
  isAdmin,
  pending,
}: {
  explicit: Locale | null;
  isAdmin: boolean;
  pending: number;
}) {
  const { t, tn, locale } = useI18n();
  const router = useRouter();
  const [count, setCount] = useState(pending);

  useEffect(() => setCount(pending), [pending]);

  // Klockan uppdateras när fliken blir synlig och därefter var 45:e sekund.
  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/admin/pending-count", { cache: "no-store" });
        if (res.ok) setCount((await res.json()).count);
      } catch {
        /* offline — behåll senaste siffran */
      }
    };
    const timer = setInterval(load, 45_000);
    document.addEventListener("visibilitychange", load);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [isAdmin]);

  function choose(value: string) {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    if (value === "auto") {
      document.cookie = `${LANG_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    } else {
      document.cookie = `${LANG_COOKIE}=${value}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure}`;
    }
    router.refresh();
  }

  const bellLabel = count > 0 ? tn("top.bell", count) : t("top.bellNone");

  return (
    <div className="mx-auto flex w-full max-w-md items-center justify-end gap-2 px-4 pt-3">
      {isAdmin ? (
        <Link
          href="/admin/users#pending"
          aria-label={bellLabel}
          title={bellLabel}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {count > 0 ? (
            <span className="bg-accent text-accent-ink absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </Link>
      ) : null}

      <label className="relative inline-flex h-10 items-center rounded-full border border-line bg-surface-2 pl-3 pr-2 text-sm">
        <span className="sr-only">{t("top.language")}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mr-1.5 shrink-0">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <select
          className="cursor-pointer appearance-none bg-transparent pr-1 text-sm font-medium outline-none"
          value={explicit ?? "auto"}
          onChange={(e) => choose(e.target.value)}
          aria-label={t("top.language")}
        >
          <option value="auto">{t("top.langAuto", { name: LOCALE_NAMES[locale] })}</option>
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_NAMES[l]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
