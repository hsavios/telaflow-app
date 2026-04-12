"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CloudDrawConfig } from "@/lib/cloud-api";
import { effectiveNumberRangePreview } from "./runtimePreviewModel";

function randomIntInclusive(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const span = hi - lo + 1;
  if (span <= 0) return lo;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return lo + (buf[0]! % span);
}

type Props = {
  drawConfig: CloudDrawConfig;
};

export function PreviewDrawSimple({ drawConfig }: Props) {
  const { min, max } = effectiveNumberRangePreview(drawConfig);
  const pc = drawConfig.public_copy;
  const headline = pc?.headline?.trim() || drawConfig.name;
  const audience = pc?.audience_instructions?.trim() ?? null;
  const resultLabel = pc?.result_label?.trim() || "Número sorteado";

  const [display, setDisplay] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const tickRef = useRef(0);

  /** DOM timers são numéricos; tipos Node usam `Timeout` — manter handle como `number`. */
  const intervalRef = useRef<number | null>(null);

  const simular = useCallback(() => {
    if (spinning) return;
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const alvo = randomIntInclusive(min, max);
    setSpinning(true);
    setDisplay(null);
    tickRef.current = 0;
    const totalTicks = 28;
    const timerId = window.setInterval(() => {
      tickRef.current += 1;
      if (tickRef.current >= totalTicks) {
        window.clearInterval(timerId);
        intervalRef.current = null;
        setDisplay(alvo);
        setSpinning(false);
        return;
      }
      setDisplay(randomIntInclusive(min, max));
    }, 70) as unknown as number;
    intervalRef.current = timerId;
  }, [spinning, min, max]);

  useEffect(() => {
    return () => {
      if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    };
  }, []);

  const numberClass = [
    "preview-draw__number",
    spinning ? "preview-draw__number--spin" : "",
    display == null && !spinning ? "preview-draw__number--dash" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="preview-draw preview-draw--telao">
      <div className="preview-draw-shell">
        {headline ? <p className="preview-draw__headline">{headline}</p> : null}
        {audience ? <p className="preview-draw__audience">{audience}</p> : null}
        <div className="preview-draw__card">
          <p className="preview-draw__result-label">{resultLabel}</p>
          <p className={numberClass} aria-live="polite">
            {display != null ? display : "—"}
          </p>
          <p className="preview-draw__range">
            Intervalo: {min} – {max}
          </p>
          <button
            type="button"
            className="preview-draw__btn"
            disabled={spinning}
            onClick={simular}
          >
            {spinning ? "Sorteando…" : "Simular um sorteio"}
          </button>
          <p className="preview-draw__fine">
            Animação só neste navegador — não grava na Cloud nem reproduz o motor completo do
            Player.
          </p>
        </div>
      </div>
    </div>
  );
}
