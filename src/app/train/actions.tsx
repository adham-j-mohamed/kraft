"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      setError(data.error === "empty_workout" ? "Passet har inga övningar. Redigera programmet." : "Kunde inte starta passet.");
    } catch {
      setError("Ingen kontakt med servern.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button className={`btn ${primary ? "btn-primary" : ""} w-full`} onClick={start} disabled={busy} type="button">
        {busy ? "Startar…" : children}
      </button>
      {error ? <p className="text-danger text-xs">{error}</p> : null}
    </div>
  );
}

export function AbandonButton({ sessionId, label = "Avbryt passet" }: { sessionId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function abandon() {
    if (!confirm("Avbryta passet? Det sparas inte i historiken och rotationen ändras inte.")) return;
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
      {label}
    </button>
  );
}
