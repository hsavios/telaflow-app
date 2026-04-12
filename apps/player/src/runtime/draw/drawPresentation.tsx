/**
 * Apresentação do Draw Experience v1 — consome estado do Runtime Session Store
 * e agenda pura do `drawEngine` (sem lógica de negócio do sorteio).
 */

import { useEffect, useRef, useState } from "react";
import {
  buildDrawSpinSchedule,
  spinScheduleSeed,
} from "./drawEngine.js";
import { DrawSpinAudio } from "./drawSpinAudio.js";
import type { DrawPanelState } from "../runtimeSessionTypes.js";

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
};

function useSpinDisplay(
  panelState: DrawPanelState,
  pendingWinner: number | null,
  winnerValue: number | null,
  resetKey: string,
  drawAttemptId: number,
  min: number,
  max: number,
  soundEnabled: boolean,
): number | null {
  const [display, setDisplay] = useState<number | null>(null);
  const audioRef = useRef<DrawSpinAudio | null>(null);

  useEffect(() => {
    if (winnerValue != null && (panelState === "result_generated" || panelState === "result_confirmed")) {
      setDisplay(winnerValue);
    }
  }, [panelState, winnerValue]);

  useEffect(() => {
    if (panelState !== "drawing" || pendingWinner == null) {
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
    ticks.forEach((tick, idx) => {
      const id = window.setTimeout(() => {
        if (cancelled) return;
        setDisplay(tick.value);
        audio?.playTick(idx, ticks.length);
      }, acc);
      timers.push(id);
      acc += tick.delayAfterMs;
    });

    return () => {
      cancelled = true;
      timers.forEach((tid) => window.clearTimeout(tid));
      audio?.dispose();
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [panelState, pendingWinner, resetKey, drawAttemptId, min, max, soundEnabled]);

  return display;
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
}: DrawExperienceV1Props) {
  const soundEnabled =
    soundEnabledProp ?? (variant === "telao" ? true : false);
  const display = useSpinDisplay(
    panelState,
    pendingWinner,
    winnerValue,
    resetKey,
    drawAttemptId,
    min,
    max,
    soundEnabled,
  );

  const rootClass =
    variant === "telao"
      ? "draw-exp draw-exp--telao"
      : "draw-exp draw-exp--operator";
  const hint = audienceHint?.trim();

  if (panelState === "error") {
    const msg = errorMessage?.trim() || "Não foi possível concluir o sorteio.";
    return (
      <div className={`${rootClass} draw-exp--error`} role="alert">
        <p className="draw-exp__line">{msg}</p>
      </div>
    );
  }

  if (panelState === "idle") {
    return (
      <div className={rootClass} role="status">
        <p className="draw-exp__line">Preparando o sorteio…</p>
      </div>
    );
  }

  if (panelState === "ready") {
    return (
      <div className={`${rootClass} draw-exp--ready`} role="status">
        <p className="draw-exp__line">Pronto para sortear</p>
        {drawName.trim() ? (
          <p className="draw-exp__prize">{drawName.trim()}</p>
        ) : null}
        {hint ? <p className="draw-exp__hint">{hint}</p> : null}
      </div>
    );
  }

  if (panelState === "drawing") {
    return (
      <div className={`${rootClass} draw-exp--drawing`} role="status">
        {drawName.trim() ? (
          <p className="draw-exp__prize draw-exp__prize--dim">{drawName.trim()}</p>
        ) : null}
        <p className="draw-exp__status">Sorteando</p>
        <p
          className="draw-exp__number draw-exp__number--spinning"
          aria-live="polite"
          aria-atomic="true"
        >
          {display != null ? display : "—"}
        </p>
        {hint ? <p className="draw-exp__hint">{hint}</p> : null}
      </div>
    );
  }

  if (panelState === "result_generated" && winnerValue != null) {
    return (
      <div className={`${rootClass} draw-exp--result`} role="status">
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
    return (
      <div className={`${rootClass} draw-exp--confirmed`} role="status">
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
