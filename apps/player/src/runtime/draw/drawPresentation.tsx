/**
 * Apresentação do Draw Experience v1 — consome estado do Runtime Session Store
 * e agenda pura do `drawEngine` (sem lógica de negócio do sorteio).
 */

import QRCode from "qrcode";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  buildDrawSpinSchedule,
  spinScheduleSeed,
} from "./drawEngine.js";
import { DrawSpinAudio } from "./drawSpinAudio.js";
import type { DrawPanelState } from "../runtimeSessionTypes.js";
import type { PublicWindowDrawBranding } from "../publicWindowBridge.js";

export type DrawExperienceV1Props = {
  variant: "telao" | "operator";
  panelState: DrawPanelState;
  winnerValue: number | null;
  pendingWinner: number | null;
  errorMessage: string | null;
  resetKey: string;
  drawAttemptId: number;
  min: number;
  max: number;
  /** Nome do sorteio (draw_config.name) — prémio / título operacional. */
  drawName: string;
  audienceHint?: string | null;
  resultLabel: string;
  /** Tambor Web Audio; telão default true, operador default false. */
  soundEnabled?: boolean;
  /** URL pública de inscrição (QR no telão, estado «pronto»). */
  joinQrUrl?: string | null;
  /** Cores e fonte do pack (`branding.json`), quando disponíveis. */
  branding?: PublicWindowDrawBranding | null;
};

function DrawJoinQr({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: "M" }).then((d) => {
      if (!cancelled) setDataUrl(d);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  if (!dataUrl) {
    return (
      <div className="draw-join-qr draw-join-qr--loading" aria-hidden="true">
        <span className="draw-join-qr__spinner" />
      </div>
    );
  }
  return (
    <figure className="draw-join-qr">
      <img src={dataUrl} alt="" width={240} height={240} />
      <figcaption className="draw-join-qr__caption">Inscrição pelo telemóvel</figcaption>
    </figure>
  );
}

function estiloBranding(b: PublicWindowDrawBranding | null | undefined): CSSProperties | undefined {
  if (!b) return undefined;
  return {
    ["--draw-brand-primary" as string]: b.primary_color,
    ["--draw-brand-accent" as string]: b.accent_color,
    ["--draw-brand-font" as string]: b.font_family_sans,
  };
}

type SpinPalcoUi = {
  display: number | null;
  /** Penúltimo valor visível (durante o freeze antes do alvo): glow reduzido no palco. */
  isSpinPreFinal: boolean;
};

function useSpinPalcoUi(
  panelState: DrawPanelState,
  pendingWinner: number | null,
  winnerValue: number | null,
  resetKey: string,
  drawAttemptId: number,
  min: number,
  max: number,
  soundEnabled: boolean,
): SpinPalcoUi {
  const [display, setDisplay] = useState<number | null>(null);
  const [isSpinPreFinal, setIsSpinPreFinal] = useState(false);
  const audioRef = useRef<DrawSpinAudio | null>(null);

  useEffect(() => {
    if (winnerValue != null && (panelState === "result_generated" || panelState === "result_confirmed")) {
      setDisplay(winnerValue);
    }
  }, [panelState, winnerValue]);

  useEffect(() => {
    if (panelState !== "drawing" || pendingWinner == null) {
      setIsSpinPreFinal(false);
      if (panelState !== "drawing") {
        audioRef.current?.dispose();
        audioRef.current = null;
      }
      return;
    }

    const seed = spinScheduleSeed(resetKey, drawAttemptId);
    const ticks = buildDrawSpinSchedule({
      min,
      max,
      target: pendingWinner,
      seed,
    });

    const audio = soundEnabled ? new DrawSpinAudio() : null;
    audioRef.current = audio;
    void audio?.prime();

    let cancelled = false;
    const timers: number[] = [];
    let acc = 0;
    const n = ticks.length;
    ticks.forEach((tick, idx) => {
      const id = window.setTimeout(() => {
        if (cancelled) return;
        setDisplay(tick.value);
        audio?.playTick(idx, ticks.length);
        if (n >= 2 && idx === n - 2) {
          setIsSpinPreFinal(true);
        }
        if (idx === n - 1) {
          setIsSpinPreFinal(false);
        }
      }, acc);
      timers.push(id);
      acc += tick.delayAfterMs;
    });

    return () => {
      cancelled = true;
      setIsSpinPreFinal(false);
      timers.forEach((tid) => window.clearTimeout(tid));
      audio?.dispose();
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [panelState, pendingWinner, resetKey, drawAttemptId, min, max, soundEnabled]);

  return { display, isSpinPreFinal };
}

export function DrawExperienceV1({
  variant,
  panelState,
  winnerValue,
  pendingWinner,
  errorMessage,
  resetKey,
  drawAttemptId,
  min,
  max,
  drawName,
  audienceHint,
  resultLabel,
  soundEnabled: soundEnabledProp,
  joinQrUrl,
  branding,
}: DrawExperienceV1Props) {
  const soundEnabled =
    soundEnabledProp ?? (variant === "telao" ? true : false);
  const brandStyle = estiloBranding(branding);
  const { display, isSpinPreFinal } = useSpinPalcoUi(
    panelState,
    pendingWinner,
    winnerValue,
    resetKey,
    drawAttemptId,
    min,
    max,
    soundEnabled,
  );

  const chimePlayedRef = useRef<string | null>(null);
  useEffect(() => {
    chimePlayedRef.current = null;
  }, [resetKey]);

  useEffect(() => {
    if (!soundEnabled || variant !== "telao") return;
    if (panelState !== "result_generated" || winnerValue == null) return;
    const key = `${resetKey}:${drawAttemptId}:${winnerValue}`;
    if (chimePlayedRef.current === key) return;
    chimePlayedRef.current = key;
    const a = new DrawSpinAudio();
    void a.prime().then(() => {
      a.playResultChime();
      window.setTimeout(() => a.dispose(), 400);
    });
  }, [soundEnabled, variant, panelState, winnerValue, resetKey, drawAttemptId]);

  const brandClass = branding ? "draw-exp--has-branding" : "";
  const revealBrandMutedClass =
    variant === "telao" && branding && (panelState === "result_generated" || panelState === "result_confirmed")
      ? "draw-exp--reveal-brand-muted"
      : "";
  const rootClass =
    variant === "telao"
      ? `draw-exp draw-exp--telao ${brandClass} ${revealBrandMutedClass}`.trim()
      : `draw-exp draw-exp--operator ${brandClass}`.trim();
  const hint = audienceHint?.trim();

  if (panelState === "error") {
    const msg = errorMessage?.trim() || "Não foi possível concluir o sorteio.";
    return (
      <div className={`${rootClass} draw-exp--error`} style={brandStyle} role="alert">
        <p className="draw-exp__line">{msg}</p>
      </div>
    );
  }

  if (panelState === "idle") {
    return (
      <div className={rootClass} style={brandStyle} role="status">
        <p className="draw-exp__line">Preparando o sorteio…</p>
      </div>
    );
  }

  if (panelState === "ready") {
    if (variant === "telao") {
      const qr = joinQrUrl?.trim();
      return (
        <div className={`${rootClass} draw-exp--ready draw-exp--telao-stage`} style={brandStyle} role="status">
          {drawName.trim() ? (
            <p className="draw-exp__prize draw-exp__prize--telao-hero">{drawName.trim()}</p>
          ) : (
            <p className="draw-exp__line">Pronto para sortear</p>
          )}
          {hint ? <p className="draw-exp__hint draw-exp__hint--telao-subtle">{hint}</p> : null}
          {qr ? <DrawJoinQr url={qr} /> : null}
        </div>
      );
    }
    return (
      <div className={`${rootClass} draw-exp--ready`} style={brandStyle} role="status">
        <p className="draw-exp__line">Pronto para sortear</p>
        {drawName.trim() ? (
          <p className="draw-exp__prize">{drawName.trim()}</p>
        ) : null}
        {hint ? <p className="draw-exp__hint">{hint}</p> : null}
      </div>
    );
  }

  if (panelState === "drawing") {
    const numSpinClass = [
      "draw-exp__number",
      "draw-exp__number--spinning",
      variant === "telao" ? "draw-exp__number--telao-hero" : "",
      isSpinPreFinal ? "draw-exp__number--pre-final-freeze" : "",
    ]
      .filter(Boolean)
      .join(" ");
    if (variant === "telao") {
      return (
        <div className={`${rootClass} draw-exp--drawing draw-exp--telao-stage`} style={brandStyle} role="status">
          <p className={numSpinClass} aria-live="polite" aria-atomic="true">
            {display != null ? display : "—"}
          </p>
          {drawName.trim() ? (
            <p className="draw-exp__prize draw-exp__prize--dim draw-exp__prize--telao-under-number">
              {drawName.trim()}
            </p>
          ) : null}
          <p className="draw-exp__status draw-exp__status--telao-subtle">Seleção em curso</p>
          {hint ? <p className="draw-exp__hint draw-exp__hint--telao-subtle">{hint}</p> : null}
        </div>
      );
    }
    return (
      <div className={`${rootClass} draw-exp--drawing`} style={brandStyle} role="status">
        {drawName.trim() ? (
          <p className="draw-exp__prize draw-exp__prize--dim">{drawName.trim()}</p>
        ) : null}
        <p className="draw-exp__status">Sorteando</p>
        <p className={numSpinClass} aria-live="polite" aria-atomic="true">
          {display != null ? display : "—"}
        </p>
        {hint ? <p className="draw-exp__hint">{hint}</p> : null}
      </div>
    );
  }

  if (panelState === "result_generated" && winnerValue != null) {
    if (variant === "telao") {
      return (
        <div className={`${rootClass} draw-exp--result draw-exp--telao-stage`} style={brandStyle} role="status">
          <p
            className="draw-exp__number draw-exp__number--reveal draw-exp__number--telao-hero draw-exp__number--reveal-premium"
            aria-live="polite"
          >
            {winnerValue}
          </p>
          {drawName.trim() ? (
            <p className="draw-exp__prize draw-exp__prize--telao-under-number draw-exp__prize--telao-after-reveal">
              {drawName.trim()}
            </p>
          ) : null}
          <p className="draw-exp__label draw-exp__label--telao-subtle">{resultLabel}</p>
          <p className="draw-exp__sub draw-exp__sub--telao-subtle">Aguardando confirmação do operador</p>
        </div>
      );
    }
    return (
      <div className={`${rootClass} draw-exp--result`} style={brandStyle} role="status">
        <p className="draw-exp__announce">Resultado</p>
        {drawName.trim() ? (
          <p className="draw-exp__prize draw-exp__prize--under">{drawName.trim()}</p>
        ) : null}
        <p className="draw-exp__label">{resultLabel}</p>
        <p className="draw-exp__number draw-exp__number--reveal" aria-live="polite">
          {winnerValue}
        </p>
        <p className="draw-exp__sub">Aguardando confirmação do operador</p>
      </div>
    );
  }

  if (panelState === "result_confirmed" && winnerValue != null) {
    if (variant === "telao") {
      return (
        <div className={`${rootClass} draw-exp--confirmed draw-exp--telao-stage`} style={brandStyle} role="status">
          <p
            className="draw-exp__number draw-exp__number--confirmed draw-exp__number--telao-hero draw-exp__number--reveal-premium"
            aria-live="polite"
          >
            {winnerValue}
          </p>
          {drawName.trim() ? (
            <p className="draw-exp__prize draw-exp__prize--telao-under-number draw-exp__prize--telao-after-reveal">
              {drawName.trim()}
            </p>
          ) : null}
          <p className="draw-exp__label draw-exp__label--telao-subtle">{resultLabel}</p>
        </div>
      );
    }
    return (
      <div className={`${rootClass} draw-exp--confirmed`} style={brandStyle} role="status">
        <p className="draw-exp__announce">Confirmado</p>
        {drawName.trim() ? (
          <p className="draw-exp__prize draw-exp__prize--under">{drawName.trim()}</p>
        ) : null}
        <p className="draw-exp__label">{resultLabel}</p>
        <p className="draw-exp__number draw-exp__number--confirmed" aria-live="polite">
          {winnerValue}
        </p>
      </div>
    );
  }

  return null;
}
