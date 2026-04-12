import type {
  DrawConfigContract,
  MediaRequirementContract,
  SceneContract,
} from "@telaflow/shared-contracts";
import type { ExecutionLogLevel } from "../execution/executionLog.js";
import { DrawScenePanel } from "./DrawScenePanel.js";
import { SceneMediaRenderer } from "./SceneMediaRenderer.js";
import type { SceneMediaDerivedState } from "./sceneMediaResolution.js";
import { fraseMomentoCenaPt, SCENE_TYPE_LABELS_PT } from "./sceneRuntimeUi.js";

type PlaybackLogPayload = {
  level: ExecutionLogLevel;
  code: string;
  message: string;
};

type Props = {
  scene: SceneContract;
  sceneOrdinal: number;
  sceneTotal: number;
  mediaState: SceneMediaDerivedState;
  /** Config do pack para `scene.draw_config_id` (sorteio), se existir. */
  drawConfig: DrawConfigContract | null;
  workspaceRoot: string | null;
  bindings: Record<string, string>;
  mediaRequirement: MediaRequirementContract | null;
  /** Alinhado ao store — callbacks de mídia ignoram respostas de tentativas antigas. */
  mediaPlaybackId?: number;
  onPlaybackLog: (entry: PlaybackLogPayload) => void;
};

export function ScenePresenter({
  scene,
  sceneOrdinal,
  sceneTotal,
  mediaState,
  drawConfig,
  workspaceRoot,
  bindings,
  mediaRequirement,
  mediaPlaybackId,
  onPlaybackLog,
}: Props) {
  const typeLabel = SCENE_TYPE_LABELS_PT[scene.type] ?? scene.type;
  const momento = fraseMomentoCenaPt(scene.type);

  return (
    <div
      className={`scene-presenter scene-presenter--premium scene-presenter--kind-${scene.type}`}
      role="region"
      aria-label="Palco — cena atual"
    >
      <header className="scene-presenter__header">
        <span className="scene-presenter__badge">{typeLabel}</span>
        <span className="scene-presenter__step">
          Cena {sceneOrdinal} de {sceneTotal}
        </span>
      </header>
      <h2 className="scene-presenter__title">{scene.name}</h2>
      <p className="scene-presenter__type-meta">
        Tipo: <strong>{typeLabel}</strong> · Ordem no roteiro: <strong>{scene.sort_order}</strong>
      </p>
      {scene.type !== "draw" && momento ? (
        <p className="scene-presenter__atmosphere">{momento}</p>
      ) : null}
      <details className="scene-presenter__tech">
        <summary>Detalhes técnicos (opcional)</summary>
        <dl className="scene-presenter__facts">
          <div>
            <dt>Identificador da cena</dt>
            <dd>
              <code>{scene.scene_id}</code>
            </dd>
          </div>
          {scene.media_id ? (
            <div>
              <dt>Mídia (ID no pack)</dt>
              <dd>
                <code>{scene.media_id}</code>
              </dd>
            </div>
          ) : null}
          {scene.draw_config_id ? (
            <div>
              <dt>Sorteio (ID no pack)</dt>
              <dd>
                <code>{scene.draw_config_id}</code>
              </dd>
            </div>
          ) : null}
        </dl>
      </details>
      {scene.type === "draw" && (
        <DrawScenePanel scene={scene} drawConfig={drawConfig} onPlaybackLog={onPlaybackLog} />
      )}
      <SceneMediaRenderer
        scene={scene}
        mediaState={mediaState}
        workspaceRoot={workspaceRoot}
        bindings={bindings}
        mediaRequirement={mediaRequirement}
        mediaPlaybackId={mediaPlaybackId}
        onPlaybackLog={onPlaybackLog}
      />
    </div>
  );
}
