import type { DrawConfigContract, SceneContract } from "@telaflow/shared-contracts";
import { useCallback, useEffect, useState } from "react";
import { EXECUTION_LOG_CODES } from "../execution/executionLog.js";
import type { ExecutionLogLevel } from "../execution/executionLog.js";
import { effectiveNumberRange, randomIntInclusive } from "./drawNumberRange.js";

type LogPayload = {
  level: ExecutionLogLevel;
  code: string;
  message: string;
};

type DrawPhase = "idle" | "awaiting_confirm" | "confirmed";

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

export function SceneDrawEngine({ scene, drawConfig, onPlaybackLog }: Props) {
  const [phase, setPhase] = useState<DrawPhase>("idle");
  const [rolledValue, setRolledValue] = useState<number | null>(null);

  const resetKey = `${scene.scene_id}:${scene.draw_config_id ?? ""}`;
  useEffect(() => {
    setPhase("idle");
    setRolledValue(null);
  }, [resetKey]);

  const startDraw = useCallback(() => {
    if (!drawConfig || drawConfig.enabled === false) return;
    if (drawConfig.draw_type !== "number_range") return;
    const { min, max } = effectiveNumberRange(drawConfig);
    const value = randomIntInclusive(min, max);
    setRolledValue(value);
    setPhase("awaiting_confirm");
    logDraw(
      onPlaybackLog,
      EXECUTION_LOG_CODES.DRAW_STARTED,
      `scene_id=${scene.scene_id}; draw_config_id=${drawConfig.draw_config_id}; draw_type=number_range; interval=[${min},${max}]`,
      "info",
    );
    logDraw(
      onPlaybackLog,
      EXECUTION_LOG_CODES.DRAW_RESULT_GENERATED,
      `scene_id=${scene.scene_id}; draw_config_id=${drawConfig.draw_config_id}; value=${value}`,
      "info",
    );
  }, [drawConfig, onPlaybackLog, scene.scene_id]);

  const confirmDraw = useCallback(() => {
    if (rolledValue == null || !drawConfig) return;
    logDraw(
      onPlaybackLog,
      EXECUTION_LOG_CODES.DRAW_RESULT_CONFIRMED,
      `scene_id=${scene.scene_id}; draw_config_id=${drawConfig.draw_config_id}; value=${rolledValue}`,
      "info",
    );
    setPhase("confirmed");
  }, [drawConfig, onPlaybackLog, rolledValue, scene.scene_id]);

  if (scene.type !== "draw") {
    return null;
  }

  if (!scene.draw_config_id) {
    return (
      <section className="scene-draw-engine scene-draw-engine--warn" aria-label="Sorteio MVP">
        <p className="scene-draw-engine__hint">
          Cena do tipo <code>draw</code> sem <code>draw_config_id</code> — configure na Cloud antes do
          export.
        </p>
      </section>
    );
  }

  if (!drawConfig) {
    return (
      <section className="scene-draw-engine scene-draw-engine--warn" aria-label="Sorteio MVP">
        <p className="scene-draw-engine__hint">
          Configuração <code>{scene.draw_config_id}</code> não encontrada em <code>draw-configs.json</code>.
        </p>
      </section>
    );
  }

  if (!drawConfig.enabled) {
    return (
      <section className="scene-draw-engine scene-draw-engine--warn" aria-label="Sorteio MVP">
        <p className="scene-draw-engine__hint">Esta configuração de sorteio está desactivada no pack.</p>
      </section>
    );
  }

  if (drawConfig.draw_type !== "number_range") {
    return (
      <section className="scene-draw-engine scene-draw-engine--warn" aria-label="Sorteio MVP">
        <p className="scene-draw-engine__hint">
          Tipo <code>{drawConfig.draw_type}</code> ainda não suportado no Player MVP (só{" "}
          <code>number_range</code>).
        </p>
      </section>
    );
  }

  const { min, max } = effectiveNumberRange(drawConfig);
  const rangeLabel =
    drawConfig.number_range != null
      ? `${min} … ${max} (do pack)`
      : `${min} … ${max} (omissão MVP — defina number_range no export)`;

  return (
    <section className="scene-draw-engine" aria-label="Motor de sorteio MVP">
      <p className="scene-draw-engine__muted">
        Motor MVP: intervalo numérico, sem animação nem painel público. Sem Cloud em runtime.
      </p>
      <dl className="scene-draw-engine__summary">
        <div>
          <dt>Nome</dt>
          <dd>{drawConfig.name}</dd>
        </div>
        <div>
          <dt>Modo</dt>
          <dd>
            <code>number_range</code>
          </dd>
        </div>
        <div>
          <dt>Intervalo</dt>
          <dd>{rangeLabel}</dd>
        </div>
        <div>
          <dt>Máx. vencedores</dt>
          <dd>{drawConfig.max_winners}</dd>
        </div>
      </dl>

      {phase === "idle" && (
        <div className="scene-draw-engine__actions">
          <button type="button" className="scene-draw-engine__primary" onClick={startDraw}>
            Iniciar sorteio
          </button>
        </div>
      )}

      {phase === "awaiting_confirm" && rolledValue != null && (
        <div className="scene-draw-engine__result-block">
          <p className="scene-draw-engine__result-label">Resultado (provisório)</p>
          <p className="scene-draw-engine__result-value" aria-live="polite">
            {rolledValue}
          </p>
          <div className="scene-draw-engine__actions">
            <button type="button" className="scene-draw-engine__primary" onClick={confirmDraw}>
              Confirmar resultado
            </button>
          </div>
        </div>
      )}

      {phase === "confirmed" && rolledValue != null && (
        <div className="scene-draw-engine__result-block scene-draw-engine__result-block--confirmed">
          <p className="scene-draw-engine__result-label">Resultado confirmado</p>
          <p className="scene-draw-engine__result-value">{rolledValue}</p>
        </div>
      )}
    </section>
  );
}
