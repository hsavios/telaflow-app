/**
 * Painel operacional de sorteio (MVP) para cenas `draw` em `executing`.
 * Estados: idle → ready | error; ready → drawing → result_generated → result_confirmed.
 * Estado compartilhado via DrawRuntimeProvider (visão pública espelha o mesmo runtime).
 * Sem Cloud em runtime, sem múltiplos vencedores nem persistência de exclusão de números.
 */

import type { DrawConfigContract, SceneContract } from "@telaflow/shared-contracts";
import { useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { EXECUTION_LOG_CODES } from "../execution/executionLog.js";
import type { ExecutionLogLevel } from "../execution/executionLog.js";
import { useDrawRuntime } from "./drawRuntimeContext.js";
import { validateDrawSceneNumberRange } from "./drawValidation.js";
import { effectiveNumberRange, randomIntInclusive } from "./drawNumberRange.js";

export type { DrawPanelState } from "./drawRuntimeContext.js";

type LogPayload = {
  level: ExecutionLogLevel;
  code: string;
  message: string;
};

type Props = {
  scene: SceneContract;
  drawConfig: DrawConfigContract | null;
  onPlaybackLog: (entry: LogPayload) => void;
};

const SORTEIO_DELAY_MS = 480;

function logDraw(
  onPlaybackLog: (entry: LogPayload) => void,
  code: string,
  message: string,
  level: ExecutionLogLevel = "info",
) {
  onPlaybackLog({ level, code, message });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function DrawScenePanel({ scene, drawConfig, onPlaybackLog }: Props) {
  const {
    resetKey,
    panelState,
    setPanelState,
    winnerValue,
    setWinnerValue,
    errorMessage,
    setErrorMessage,
  } = useDrawRuntime();

  const failLoggedRef = useRef<string | null>(null);
  const staticFailLoggedRef = useRef<string | null>(null);

  useEffect(() => {
    failLoggedRef.current = null;
    staticFailLoggedRef.current = null;
  }, [resetKey]);

  /* Erros de configuração antes da máquina de estados (draw_failed uma vez por cena/config). */
  useEffect(() => {
    if (scene.type !== "draw") return;
    const k = `${resetKey}:static`;
    let message: string | null = null;
    if (!scene.draw_config_id) {
      message = `scene_id=${scene.scene_id}; cena draw sem draw_config_id.`;
    } else if (!drawConfig) {
      message = `scene_id=${scene.scene_id}; draw_config_id=${scene.draw_config_id} não encontrado em draw-configs.json do pack.`;
    } else if (drawConfig.draw_type !== "number_range") {
      message = `scene_id=${scene.scene_id}; draw_config_id=${drawConfig.draw_config_id}; draw_type=${drawConfig.draw_type} não suportado no MVP (apenas number_range).`;
    }
    if (!message) return;
    if (staticFailLoggedRef.current === k) return;
    staticFailLoggedRef.current = k;
    logDraw(onPlaybackLog, EXECUTION_LOG_CODES.DRAW_FAILED, message, "warn");
  }, [drawConfig, onPlaybackLog, resetKey, scene]);

  const logFailOnce = useCallback(
    (message: string, level: ExecutionLogLevel = "warn") => {
      if (failLoggedRef.current === resetKey) return;
      failLoggedRef.current = resetKey;
      logDraw(onPlaybackLog, EXECUTION_LOG_CODES.DRAW_FAILED, message, level);
    },
    [onPlaybackLog, resetKey],
  );

  /* Validação e erros estáticos: sincroniza contexto para a visão pública espelhar o mesmo estado. */
  useEffect(() => {
    if (scene.type !== "draw") return;

    if (!scene.draw_config_id) {
      setErrorMessage(
        "Esta cena de sorteio não tem identificador (draw_config_id). Corrija o export na Cloud.",
      );
      setPanelState("error");
      return;
    }
    if (!drawConfig) {
      setErrorMessage(
        "A configuração deste sorteio não está neste pacote. Verifique draw-configs.json no export.",
      );
      setPanelState("error");
      return;
    }
    if (drawConfig.draw_type !== "number_range") {
      setErrorMessage("Este tipo de sorteio não é suportado neste MVP (apenas number_range).");
      setPanelState("error");
      return;
    }

    const v = validateDrawSceneNumberRange(scene, drawConfig);
    if (!v.ok) {
      setErrorMessage(v.reason);
      setPanelState("error");
      logFailOnce(
        `scene_id=${scene.scene_id}; draw_config_id=${scene.draw_config_id}; ${v.reason}`,
        "warn",
      );
      return;
    }
    setPanelState("ready");
    setErrorMessage(null);
  }, [drawConfig, logFailOnce, resetKey, scene, setErrorMessage, setPanelState]);

  const startDraw = useCallback(async () => {
    if (!drawConfig || panelState !== "ready") return;
    const v = validateDrawSceneNumberRange(scene, drawConfig);
    if (!v.ok) {
      setErrorMessage(v.reason);
      setPanelState("error");
      logFailOnce(`draw_config_id=${drawConfig.draw_config_id}; ${v.reason}`);
      return;
    }
    const { min, max } = effectiveNumberRange(drawConfig);
    logDraw(
      onPlaybackLog,
      EXECUTION_LOG_CODES.DRAW_STARTED,
      `scene_id=${scene.scene_id}; draw_config_id=${drawConfig.draw_config_id}; draw_type=number_range; start_number=${v.startNumber}; end_number=${v.endNumber}`,
      "info",
    );
    setPanelState("drawing");
    try {
      await sleep(SORTEIO_DELAY_MS);
      const value = randomIntInclusive(min, max);
      setWinnerValue(value);
      logDraw(
        onPlaybackLog,
        EXECUTION_LOG_CODES.DRAW_RESULT_GENERATED,
        `scene_id=${scene.scene_id}; draw_config_id=${drawConfig.draw_config_id}; winner=${value}`,
        "info",
      );
      setPanelState("result_generated");
    } catch {
      const msg = "Falha inesperada durante o sorteio.";
      setErrorMessage(msg);
      setPanelState("error");
      logDraw(
        onPlaybackLog,
        EXECUTION_LOG_CODES.DRAW_FAILED,
        `scene_id=${scene.scene_id}; draw_config_id=${drawConfig.draw_config_id}; ${msg}`,
        "error",
      );
    }
  }, [
    drawConfig,
    logFailOnce,
    onPlaybackLog,
    panelState,
    scene,
    setErrorMessage,
    setPanelState,
    setWinnerValue,
  ]);

  const confirmDraw = useCallback(() => {
    if (winnerValue == null || !drawConfig || panelState !== "result_generated") return;
    logDraw(
      onPlaybackLog,
      EXECUTION_LOG_CODES.DRAW_RESULT_CONFIRMED,
      `scene_id=${scene.scene_id}; draw_config_id=${drawConfig.draw_config_id}; winner=${winnerValue}`,
      "info",
    );
    setPanelState("result_confirmed");
  }, [drawConfig, onPlaybackLog, panelState, scene.scene_id, setPanelState, winnerValue]);

  if (scene.type !== "draw") {
    return null;
  }

  if (!scene.draw_config_id) {
    return (
      <DrawPanelChrome variant="error">
        <p className="draw-scene-panel__hint">
          Cena do tipo <code>draw</code> sem <code>draw_config_id</code>. Configure o sorteio na Cloud antes de
          exportar o pack.
        </p>
      </DrawPanelChrome>
    );
  }

  if (!drawConfig) {
    return (
      <DrawPanelChrome variant="error">
        <p className="draw-scene-panel__hint">
          Não há entrada para <code>{scene.draw_config_id}</code> em <code>draw-configs.json</code> neste
          pacote exportado.
        </p>
      </DrawPanelChrome>
    );
  }

  if (drawConfig.draw_type !== "number_range") {
    return (
      <DrawPanelChrome variant="error">
        <p className="draw-scene-panel__hint">
          Tipo <code>{drawConfig.draw_type}</code> não suportado neste MVP (apenas{" "}
          <code>number_range</code>).
        </p>
      </DrawPanelChrome>
    );
  }

  const { min: startNumber, max: endNumber } = effectiveNumberRange(drawConfig);
  const intervaloOrigem =
    drawConfig.number_range != null
      ? "Intervalo definido no pack (number_range.min / number_range.max)."
      : "Intervalo padrão do Player (1…1000) — recomendamos definir number_range no pacote exportado.";

  return (
    <DrawPanelChrome variant="default">
      <p className="draw-scene-panel__muted">
        Sorteio MVP: um número por execução, sem exclusão persistente de números nem múltiplos vencedores.
        Sem Cloud em runtime.
      </p>

      <dl className="draw-scene-panel__summary">
        <div>
          <dt>Nome do sorteio</dt>
          <dd>{drawConfig.name}</dd>
        </div>
        <div>
          <dt>draw_config_id</dt>
          <dd>
            <code>{drawConfig.draw_config_id}</code>
          </dd>
        </div>
        <div>
          <dt>Tipo (draw_type)</dt>
          <dd>
            <code>{drawConfig.draw_type}</code>
          </dd>
        </div>
        <div>
          <dt>Intervalo (start_number … end_number)</dt>
          <dd>
            <strong>
              {startNumber} … {endNumber}
            </strong>
            <span className="draw-scene-panel__interval-note"> — {intervaloOrigem}</span>
          </dd>
        </div>
        <div>
          <dt>Máx. vencedores (referência)</dt>
          <dd>{drawConfig.max_winners} (MVP: só um número sorteado)</dd>
        </div>
      </dl>

      {panelState === "idle" && (
        <p className="draw-scene-panel__status" aria-live="polite">
          Validando configuração do sorteio...
        </p>
      )}

      {panelState === "ready" && (
        <div className="draw-scene-panel__actions">
          <button type="button" className="draw-scene-panel__primary" onClick={() => void startDraw()}>
            Iniciar sorteio
          </button>
        </div>
      )}

      {panelState === "drawing" && (
        <p className="draw-scene-panel__drawing" aria-live="assertive">
          Sorteando...
        </p>
      )}

      {panelState === "result_generated" && winnerValue != null && (
        <div className="draw-scene-panel__result-block">
          <p className="draw-scene-panel__result-label">Número sorteado</p>
          <p className="draw-scene-panel__result-value" aria-live="polite">
            {winnerValue}
          </p>
          <div className="draw-scene-panel__actions">
            <button type="button" className="draw-scene-panel__primary" onClick={confirmDraw}>
              Confirmar resultado
            </button>
          </div>
        </div>
      )}

      {panelState === "result_confirmed" && winnerValue != null && (
        <div className="draw-scene-panel__result-block draw-scene-panel__result-block--confirmed">
          <p className="draw-scene-panel__result-label">Resultado confirmado pelo operador</p>
          <p className="draw-scene-panel__result-value">{winnerValue}</p>
          <p className="draw-scene-panel__confirmed-note">
            O valor foi registrado no log de execução (JSONL). Você pode avançar no roteiro quando estiver pronto.
          </p>
        </div>
      )}

      {panelState === "error" && errorMessage && (
        <div className="draw-scene-panel__error-box" role="alert">
          <strong>Não é possível sortear</strong>
          <p>{errorMessage}</p>
        </div>
      )}
    </DrawPanelChrome>
  );
}

function DrawPanelChrome({
  variant,
  children,
}: {
  variant: "default" | "error";
  children: ReactNode;
}) {
  const cls =
    variant === "error"
      ? "draw-scene-panel draw-scene-panel--error"
      : "draw-scene-panel";
  return (
    <section className={cls} aria-label="Painel de sorteio MVP">
      {children}
    </section>
  );
}
