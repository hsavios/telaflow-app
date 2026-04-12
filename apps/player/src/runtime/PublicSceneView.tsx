/**
 * Visão pública: só o conteúdo da cena ativa (título, tipo amigável, mídia e espelho do sorteio).
 * Sem roteiro, logs ou controles.
 * - Na janela do operador: lê o slice de sorteio do `RuntimeSessionStore` via `useDrawRuntime`.
 * - Na janela pública Tauri: passe `remoteDrawSnapshot` vindo do `emitTo`.
 */

import type {
  DrawConfigContract,
  MediaRequirementContract,
  SceneContract,
  SceneType,
} from "@telaflow/shared-contracts";
import { SceneMediaRenderer } from "./SceneMediaRenderer.js";
import type { SceneMediaDerivedState } from "./sceneMediaResolution.js";
import type { DrawPanelState } from "./drawRuntimeContext.js";
import { useDrawRuntime } from "./drawRuntimeContext.js";
import type { PublicWindowDrawSnapshot } from "./publicWindowBridge.js";

const TYPE_LABELS_PUBLIC: Record<SceneType, string> = {
  opening: "Abertura",
  institutional: "Institucional",
  sponsor: "Patrocinador",
  draw: "Sorteio",
  break: "Intervalo",
  closing: "Encerramento",
};

type PlaybackLogPayload = {
  level: "info" | "warn" | "error";
  code: string;
  message: string;
};

type Props = {
  scene: SceneContract;
  mediaState: SceneMediaDerivedState;
  drawConfig: DrawConfigContract | null;
  workspaceRoot: string | null;
  bindings: Record<string, string>;
  mediaRequirement: MediaRequirementContract | null;
  /** `remote`: snapshot vindo da janela do operador (Tauri). Omitir: lê o store na mesma webview. */
  drawMirrorMode?: "context" | "remote";
  /** Obrigatório quando `drawMirrorMode === "remote"` e a cena é `draw`. */
  remoteDrawSnapshot?: PublicWindowDrawSnapshot | null;
};

/** Sem logs de execução a partir da janela pública (operador mantém o registro JSONL). */
function noopPlaybackLog(_entry: PlaybackLogPayload) {}

function drawMirrorBody(
  scene: SceneContract,
  drawConfig: DrawConfigContract | null,
  panelState: DrawPanelState,
  winnerValue: number | null,
  errorMessage: string | null,
) {
  if (panelState === "error" && errorMessage) {
    return (
      <div className="public-scene-view__draw public-scene-view__draw--error" role="alert">
        <p className="public-scene-view__draw-line">{errorMessage}</p>
      </div>
    );
  }

  if (!scene.draw_config_id || !drawConfig || drawConfig.draw_type !== "number_range") {
    return (
      <div className="public-scene-view__draw public-scene-view__draw--muted" role="status">
        <p>Sorteio indisponível neste momento.</p>
      </div>
    );
  }

  if (panelState === "idle") {
    return (
      <div className="public-scene-view__draw" role="status">
        <p className="public-scene-view__draw-line">Preparando sorteio...</p>
      </div>
    );
  }

  if (panelState === "ready") {
    return (
      <div className="public-scene-view__draw public-scene-view__draw--ready" role="status">
        <p className="public-scene-view__draw-line">Pronto para sortear</p>
        <p className="public-scene-view__draw-sub">{drawConfig.name}</p>
      </div>
    );
  }

  if (panelState === "drawing") {
    return (
      <div className="public-scene-view__draw public-scene-view__draw--drawing" role="status">
        <p className="public-scene-view__draw-line public-scene-view__draw-line--pulse">Sorteando...</p>
      </div>
    );
  }

  if (panelState === "result_generated" && winnerValue != null) {
    return (
      <div className="public-scene-view__draw public-scene-view__draw--result" role="status">
        <p className="public-scene-view__draw-label">Número sorteado</p>
        <p className="public-scene-view__draw-number" aria-live="polite">
          {winnerValue}
        </p>
        <p className="public-scene-view__draw-sub">Aguardando confirmação do operador</p>
      </div>
    );
  }

  if (panelState === "result_confirmed" && winnerValue != null) {
    return (
      <div className="public-scene-view__draw public-scene-view__draw--confirmed" role="status">
        <p className="public-scene-view__draw-label">Sorteio confirmado</p>
        <p className="public-scene-view__draw-number">{winnerValue}</p>
      </div>
    );
  }

  return null;
}

function PublicDrawMirrorFromContext({
  scene,
  drawConfig,
}: {
  scene: SceneContract;
  drawConfig: DrawConfigContract | null;
}) {
  const { panelState, winnerValue, errorMessage } = useDrawRuntime();
  return <>{drawMirrorBody(scene, drawConfig, panelState, winnerValue, errorMessage)}</>;
}

function PublicDrawMirrorRemote({
  scene,
  drawConfig,
  snapshot,
}: {
  scene: SceneContract;
  drawConfig: DrawConfigContract | null;
  snapshot: PublicWindowDrawSnapshot;
}) {
  return (
    <>
      {drawMirrorBody(
        scene,
        drawConfig,
        snapshot.panelState,
        snapshot.winnerValue,
        snapshot.errorMessage,
      )}
    </>
  );
}

export function PublicSceneView({
  scene,
  mediaState,
  drawConfig,
  workspaceRoot,
  bindings,
  mediaRequirement,
  drawMirrorMode = "context",
  remoteDrawSnapshot,
}: Props) {
  const typeLabel = TYPE_LABELS_PUBLIC[scene.type] ?? scene.type;

  return (
    <article className="public-scene-view" aria-label="Saída pública — cena atual">
      <header className="public-scene-view__header">
        <p className="public-scene-view__kind">{typeLabel}</p>
        <h1 className="public-scene-view__title">{scene.name}</h1>
      </header>

      {scene.type === "draw" ? (
        drawMirrorMode === "remote" ? (
          <PublicDrawMirrorRemote
            scene={scene}
            drawConfig={drawConfig}
            snapshot={
              remoteDrawSnapshot ?? {
                resetKey: "",
                panelState: "idle",
                winnerValue: null,
                errorMessage: null,
              }
            }
          />
        ) : (
          <PublicDrawMirrorFromContext scene={scene} drawConfig={drawConfig} />
        )
      ) : null}

      <div className="public-scene-view__media">
        <SceneMediaRenderer
          scene={scene}
          mediaState={mediaState}
          workspaceRoot={workspaceRoot}
          bindings={bindings}
          mediaRequirement={mediaRequirement}
          presentation="public"
          onPlaybackLog={noopPlaybackLog}
        />
      </div>
    </article>
  );
}
