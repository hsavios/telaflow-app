/**
 * Painel operacional de sorteio (MVP) para cenas `draw` em `executing`.
 * Estado operacional no `RuntimeSessionStore`; aqui só leitura + ações explícitas e log estático.
 */

import type { DrawConfigContract, SceneContract } from "@telaflow/shared-contracts";
import { useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { EXECUTION_LOG_CODES } from "../execution/executionLog.js";
import type { ExecutionLogLevel } from "../execution/executionLog.js";
import { useDrawRuntime } from "./drawRuntimeContext.js";
import { useRuntimeSession } from "./RuntimeSessionContext.js";
import { effectiveNumberRange } from "./drawNumberRange.js";

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

function logDraw(
  onPlaybackLog: (entry: LogPayload) => void,
  code: string,
  message: string,
  level: ExecutionLogLevel = "info",
) {
  onPlaybackLog({ level, code, message });
}

export function DrawScenePanel({ scene, drawConfig, onPlaybackLog }: Props) {
  const { comandos, seletores } = useRuntimeSession();
  const cmdSorteio = seletores.comandos.iniciarSorteio;
  const cmdConfirmar = seletores.comandos.confirmarSorteio;
  const { resetKey, panelState, winnerValue, errorMessage } = useDrawRuntime();

  const staticFailLoggedRef = useRef<string | null>(null);

  useEffect(() => {
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

  const iniciarSorteio = useCallback(() => {
    if (!drawConfig) return;
    void comandos.iniciar_sorteio({ scene, drawConfig });
  }, [comandos, drawConfig, scene]);

  const confirmarResultado = useCallback(() => {
    if (!drawConfig) return;
    comandos.confirmar_resultado_sorteio({ scene, drawConfig });
  }, [comandos, drawConfig, scene]);

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
          <button
            type="button"
            className="draw-scene-panel__primary"
            disabled={!cmdSorteio.permitido}
            title={cmdSorteio.permitido ? undefined : cmdSorteio.motivo}
            onClick={iniciarSorteio}
          >
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
            <button
              type="button"
              className="draw-scene-panel__primary"
              disabled={!cmdConfirmar.permitido}
              title={cmdConfirmar.permitido ? undefined : cmdConfirmar.motivo}
              onClick={confirmarResultado}
            >
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
