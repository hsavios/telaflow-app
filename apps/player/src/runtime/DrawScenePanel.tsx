/**
 * Painel operacional de sorteio (MVP) para cenas `draw` em `executing`.
 * Estado operacional no `RuntimeSessionStore`; aqui só leitura + ações explícitas e log estático.
 */

import type { DrawConfigContract, SceneContract } from "@telaflow/shared-contracts";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { EXECUTION_LOG_CODES } from "../execution/executionLog.js";
import type { ExecutionLogLevel } from "../execution/executionLog.js";
import { DrawExperienceV1 } from "./draw/drawPresentation.js";
import { readDrawHistory } from "./draw/drawHistory.js";
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
  const cmdProximo = seletores.comandos.prepararProximoSorteio;
  const drawSnap = useDrawRuntime();
  const { resetKey, panelState, winnerValue } = drawSnap;

  const historicoSorteios = useMemo(
    () => readDrawHistory(),
    [panelState, winnerValue, resetKey],
  );

  const drawBranding = useMemo(() => {
    const b = seletores.loadedPack?.branding;
    if (!b) return null;
    const t = b.tokens;
    return {
      primary_color: t.primary_color,
      accent_color: t.accent_color,
      font_family_sans: t.font_family_sans,
    };
  }, [seletores.loadedPack]);

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

  const prepararProximoSorteio = useCallback(() => {
    comandos.preparar_proximo_sorteio();
  }, [comandos]);

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
  const publicCopy = drawConfig.public_copy;
  const resultLabel = publicCopy?.result_label?.trim() || "Número sorteado";
  const audienceHint = publicCopy?.audience_instructions?.trim() ?? null;
  const intervaloOrigem =
    drawConfig.number_range != null
      ? "Intervalo definido no pack (number_range.min / number_range.max)."
      : "Intervalo padrão do Player (1…1000) — recomendamos definir number_range no pacote exportado.";

  return (
    <DrawPanelChrome variant="default">
      <p className="draw-scene-panel__operator-badge" aria-hidden="true">
        Painel do operador — não é o telão do público
      </p>
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

      {(panelState === "ready" ||
        panelState === "drawing" ||
        panelState === "result_generated" ||
        panelState === "result_confirmed" ||
        panelState === "error") && (
        <div className="draw-scene-panel__experience">
          <DrawExperienceV1
            variant="operator"
            panelState={panelState}
            winnerValue={drawSnap.winnerValue}
            pendingWinner={drawSnap.pendingWinner}
            errorMessage={drawSnap.errorMessage}
            resetKey={drawSnap.resetKey}
            drawAttemptId={drawSnap.drawAttemptId}
            min={startNumber}
            max={endNumber}
            drawName={drawConfig.name ?? ""}
            audienceHint={audienceHint}
            resultLabel={resultLabel}
            soundEnabled={false}
            branding={drawBranding}
          />
        </div>
      )}

      {historicoSorteios.length > 0 && (
        <div className="draw-scene-panel__history">
          <h3 className="draw-scene-panel__history-title">Últimos sorteios (neste equipamento)</h3>
          <ul className="draw-scene-panel__history-list">
            {historicoSorteios.map((row, i) => (
              <li key={`h-${i}-${row.at}-${row.resetKey}-${row.value}`} className="draw-scene-panel__history-item">
                <span className="draw-scene-panel__history-value">{row.value}</span>
                <span className="draw-scene-panel__history-name">{row.drawName || "—"}</span>
                <time className="draw-scene-panel__history-time" dateTime={row.at}>
                  {new Date(row.at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ul>
        </div>
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

      {panelState === "result_generated" && winnerValue != null && (
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
      )}

      {panelState === "result_confirmed" && winnerValue != null && (
        <>
          <div className="draw-scene-panel__actions">
            <button
              type="button"
              className="draw-scene-panel__secondary"
              disabled={!cmdProximo.permitido}
              title={cmdProximo.permitido ? undefined : cmdProximo.motivo}
              onClick={prepararProximoSorteio}
            >
              Próximo sorteio
            </button>
          </div>
          <p className="draw-scene-panel__confirmed-note">
            O valor foi registrado no log de execução (JSONL). Você pode avançar no roteiro quando estiver pronto.
          </p>
        </>
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
      : "draw-scene-panel draw-scene-panel--operator-chrome";
  return (
    <section className={cls} aria-label="Painel de sorteio do operador">
      {children}
    </section>
  );
}
