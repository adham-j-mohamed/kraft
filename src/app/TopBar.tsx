"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { LANG_COOKIE, LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/locales";
import type { Theme } from "@/lib/theme";
import { Logo } from "./Logo";

const ONE_YEAR = 60 * 60 * 24 * 365;
const CHIP = "inline-flex h-10 items-center justify-center rounded-full border border-line bg-surface-2";

/**
 * Fält längst upp på alla sidor. Till vänster loggan (leder alltid till startsidan). Till höger:
 * för admin en ringklocka med antalet väntande konton, språkval, temaknapp och hjälp. Språket
 * följer enheten tills man väljer själv; "Auto" tar bort det egna valet igen. På smala skärmar
 * bryts kontrollerna till en egen rad i stället för att tryckas ut ur bild.
 */
export function TopBar({
  explicit,
  isAdmin,
  pending,
  theme,
}: {
  explicit: Locale | null;
  isAdmin: boolean;
  pending: number;
  theme: Theme;
}) {
  const { t, tn, locale } = useI18n();
  const router = useRouter();
  const [count, setCount] = useState(pending);
  const [current, setCurrent] = useState<Theme>(theme);

  // SW sync state
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => setCount(pending), [pending]);
  useEffect(() => setCurrent(theme), [theme]);

  // Register service worker for PWA and offline queue (client-side only).
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // If the service worker is active, ask it to flush when we come online.
        function onOnline() {
          if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage('flush');
        }
        window.addEventListener('online', onOnline);
        // Try an immediate flush when registered
        if (reg.active) reg.active.postMessage('flush');
        return () => window.removeEventListener('online', onOnline);
      })
      .catch(() => {
        /* ignore registration failure (dev, http, etc.) */
      });

    // Listen for SW messages about queue/sync state
    function onMessage(ev: MessageEvent) {
      const data = ev.data || {};
      switch (data.type) {
        case 'queue':
          setQueuedCount(typeof data.queued === 'number' ? data.queued : 0);
          if ((data.queued ?? 0) === 0) {
            setSyncing(false);
            setSyncMessage(null);
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

  async function toggleTheme() {
    const next: Theme = current === "dark" ? "light" : "dark";
    // Direkt återkoppling; servern sätter kakan, sparar på kontot och renderar om med rätt tema.
    document.documentElement.setAttribute("data-theme", next);
    setCurrent(next);
    try {
      await fetch("/api/me/theme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ theme: next }),
      });
    } catch {
      /* offline: valet gäller tills sidan laddas om */
    }
    router.refresh();
  }

  const bellLabel = count > 0 ? tn("top.bell", count) : t("top.bellNone");
  const themeLabel = current === "dark" ? t("theme.toLight") : t("theme.toDark");

  return (
    <div className="mx-auto flex w-full max-w-md flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-3">
      <Link href="/" aria-label={t("top.home")} title={t("top.home")} className="rounded-full py-1">
        <Logo />
      </Link>

      <div className="flex items-center gap-2">
        {isAdmin ? (
          <Link href="/admin/users#pending" aria-label={bellLabel} title={bellLabel} className={`${CHIP} relative w-10`}>
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

        {/* Synlig text är bara språkkoden; den riktiga väljaren ligger osynlig ovanpå. */}
        <label className={`${CHIP} relative gap-1.5 px-3 text-sm font-semibold`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span aria-hidden="true">{locale.toUpperCase()}</span>
          <select
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
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

        <button type="button" onClick={toggleTheme} aria-label={themeLabel} title={themeLabel} className={`${CHIP} w-10`}>
          {current === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          )}
        </button>

        {/* Sync indicator: small pill showing queued/sync state */}
        {queuedCount > 0 || syncing ? (
          <div className={`${CHIP} px-3 mr-2 text-sm`} title={syncMessage ?? `${queuedCount} i kö`}> 
            {syncing ? (
              <span className="inline-flex items-center gap-2"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 0-3 6.7"/><path d="M21 3v6h-6"/></svg><span>{syncMessage ?? 'Synkar…'}</span></span>
            ) : (
              <span className="inline-flex items-center gap-2">{queuedCount} i kö</span>
            )}
          </div>
        ) : null}

        <Link href="/help" aria-label={t("top.help")} title={t("top.help")} className={`${CHIP} w-10`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
