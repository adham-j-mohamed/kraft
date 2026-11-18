"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/** Skapa, kopiera och ta bort hälsonyckeln. Klartexten finns bara i den här komponentens state. */
export function HealthSync({ hasToken }: { hasToken: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function create() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/me/health-token", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      setToken((await res.json()).token);
      setCopied(false);
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!window.confirm(t("health.revoke.confirm"))) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/me/health-token", { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(String(res.status));
      setToken(null);
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
    } catch {
      // Clipboard-API:t kan nekas; då markerar användaren texten själv.
      setCopied(false);
    }
  }

  return (
    <>
      <section className="card flex flex-col gap-3 text-sm">
        <p className="font-semibold">{t("health.step1")}</p>
        <p className="muted text-xs">{t("health.step1.body")}</p>
        {token ? (
          <>
            <input className="input font-mono text-xs" readOnly value={token} onFocus={(e) => e.currentTarget.select()} aria-label={t("health.step1")} />
            <button type="button" className="btn btn-primary w-full" onClick={copy}>
              {copied ? t("health.copied") : t("health.copy")}
            </button>
          </>
        ) : null}
        <button type="button" className={`btn w-full ${token || hasToken ? "" : "btn-primary"}`} disabled={busy} onClick={create}>
          {hasToken || token ? t("health.replace") : t("health.create")}
        </button>
      </section>

      <section className="card flex flex-col gap-3 text-sm">
        <p className="font-semibold">{t("health.step2")}</p>
        <p className="muted text-xs">{t("health.step2.body")}</p>
        <a className="btn btn-primary w-full" href="/shortcuts/kraft-halsosynk.shortcut">
          {t("health.download")}
        </a>
      </section>

      <section className="card flex flex-col gap-3 text-sm">
        <p className="font-semibold">{t("health.step3")}</p>
        <p className="muted text-xs">{t("health.step3.body")}</p>
        <p className="muted text-xs">{t("health.step3.note")}</p>
      </section>

      {hasToken || token ? (
        <button type="button" className="btn w-full" disabled={busy} onClick={revoke}>
          {t("health.revoke")}
        </button>
      ) : null}
      {failed ? <p className="text-sm text-danger">{t("health.error")}</p> : null}
    </>
  );
}
