"use client";

import type { IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

type Status = "starting" | "scanning" | "denied" | "none" | "insecure" | "unsupported" | "error";

/**
 * Kameraskanner för streckkoder. Safari på iOS saknar `BarcodeDetector`, så avkodningen görs
 * av ZXing (laddas först när skannern öppnas). Kameran kräver https och ett tryck av användaren,
 * och stängs alltid av när komponenten försvinner. Manuell inmatning finns som reserv.
 */
export function BarcodeScanner({
  onCode,
  onClose,
  busy,
}: {
  onCode: (code: string) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const { t } = useI18n();
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const last = useRef({ code: "", at: 0 });
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  const [status, setStatus] = useState<Status>("starting");
  const [torch, setTorch] = useState<boolean | null>(null);
  const [manual, setManual] = useState("");
  const [manualError, setManualError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const element = video.current;

    (async () => {
      if (!window.isSecureContext) return setStatus("insecure");
      if (!navigator.mediaDevices?.getUserMedia) return setStatus("unsupported");
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        const hints = new Map<import("@zxing/library").DecodeHintType, unknown>([
          [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
          [DecodeHintType.TRY_HARDER, true],
        ]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
        const c = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
          element ?? undefined,
          (result) => {
            if (!result) return;
            const code = result.getText();
            const now = Date.now();
            // Samma kod läses många gånger per sekund; släpp igenom den en gång.
            if (last.current.code === code && now - last.current.at < 2500) return;
            last.current = { code, at: now };
            navigator.vibrate?.(60);
            onCodeRef.current(code);
          },
        );
        if (cancelled) {
          c.stop();
          return;
        }
        controls.current = c;
        setStatus("scanning");
        setTorch(c.switchTorch ? false : null);
      } catch (err) {
        if (cancelled) return;
        const name = (err as { name?: string } | null)?.name;
        setStatus(
          name === "NotAllowedError" || name === "SecurityError"
            ? "denied"
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "none"
              : "error",
        );
      }
    })();

    return () => {
      cancelled = true;
      controls.current?.stop();
      controls.current = null;
      (element?.srcObject as MediaStream | null)?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function toggleTorch() {
    try {
      await controls.current?.switchTorch?.(!torch);
      setTorch(!torch);
    } catch {
      /* ficklampan stöds inte på den här enheten */
    }
  }

  function submitManual() {
    const code = manual.replace(/\D/g, "");
    if (!/^\d{8,14}$/.test(code)) return setManualError(true);
    setManualError(false);
    onCode(code);
  }

  const problem: Record<Exclude<Status, "starting" | "scanning">, string> = {
    denied: t("scan.err.denied"),
    none: t("scan.err.none"),
    insecure: t("scan.err.insecure"),
    unsupported: t("scan.err.unsupported"),
    error: t("scan.err.generic"),
  };

  return (
    <section className="card border-accent/50 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("scan.title")}</h2>
        <button type="button" className="btn h-9 min-h-0 px-3 text-xs" onClick={onClose}>
          {t("scan.close")}
        </button>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
        <video ref={video} playsInline muted autoPlay className="h-full w-full object-cover" />
        {status === "scanning" ? (
          <div aria-hidden="true" className="border-accent pointer-events-none absolute inset-x-[8%] top-[30%] h-[40%] rounded-lg border-2" />
        ) : null}
        {status !== "scanning" ? (
          <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white" role={status === "starting" ? "status" : "alert"}>
            {status === "starting" ? t("scan.starting") : problem[status]}
          </p>
        ) : null}
      </div>

      {status === "scanning" ? <p className="muted text-xs">{t("scan.aim")}</p> : null}
      {torch !== null ? (
        <button type="button" className="btn w-full" onClick={toggleTorch} aria-pressed={torch}>
          {torch ? t("scan.torchOff") : t("scan.torchOn")}
        </button>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="muted">{t("scan.manual")}</span>
          <div className="flex gap-2">
            <input
              className="input"
              inputMode="numeric"
              autoComplete="off"
              value={manual}
              onChange={(e) => setManual(e.target.value.replace(/[^\d\s]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && submitManual()}
            />
            <button type="button" className="btn btn-primary px-5" onClick={submitManual} disabled={busy}>
              {t("scan.manualBtn")}
            </button>
          </div>
        </label>
        {manualError ? <p className="text-danger text-xs">{t("scan.manualErr")}</p> : null}
      </div>
    </section>
  );
}
