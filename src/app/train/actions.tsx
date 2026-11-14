"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const JSON_HEADERS = { "content-type": "application/json" };

/** Startar ett pass. `clientId` skapas här så ett omsänt anrop inte ger två pass. */
export function StartButton({
  workoutId,
  primary,
  children,
}: {
  workoutId: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ workoutId, clientId: crypto.randomUUID() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return router.push(`/train/session/${data.id}`);
      if (res.status === 409 && data.sessionId) return router.push(`/train/session/${data.sessionId}`);
      setError(data.error === "empty_workout" ? t("train.err.emptyWorkout") : t("train.err.start"));
    } catch {
      setError(t("common.noContact"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button className={`btn ${primary ? "btn-primary" : ""} w-full`} onClick={start} disabled={busy} type="button">
        {busy ? t("train.starting") : children}
      </button>
      {error ? <p className="text-danger text-xs">{error}</p> : null}
    </div>
  );
}

export function AbandonButton({ sessionId, label }: { sessionId: string; label?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function abandon() {
    if (!confirm(t("train.abandonConfirm"))) return;
    setBusy(true);
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: "abandoned" }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn w-full" onClick={abandon} disabled={busy} type="button">
      {label ?? t("train.abandon")}
    </button>
  );
}
