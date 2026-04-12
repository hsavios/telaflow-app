import type {
  DrawConfigContract,
  MediaRequirementContract,
  SceneContract,
  SceneType,
} from "@telaflow/shared-contracts";
import type { ExecutionLogLevel } from "../execution/executionLog.js";
import { SceneDrawEngine } from "./SceneDrawEngine.js";
import { SceneMediaRenderer } from "./SceneMediaRenderer.js";
import type { SceneMediaDerivedState } from "./sceneMediaResolution.js";

const TYPE_LABELS: Record<SceneType, string> = {
  opening: "Abertura",
  institutional: "Institucional",
  sponsor: "Patrocinador",
  draw: "Sorteio",
  break: "Intervalo",
  closing: "Encerramento",
};

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
  onPlaybackLog,
}: Props) {
  const typeLabel = TYPE_LABELS[scene.type] ?? scene.type;

  return (
    <div className="scene-presenter" role="region" aria-label="Cena atual (MVP visual)">
      <header className="scene-presenter__header">
        <span className="scene-presenter__badge">{typeLabel}</span>
        <span className="scene-presenter__step">
          Cena {sceneOrdinal} / {sceneTotal}
        </span>
      </header>
      <h2 className="scene-presenter__title">{scene.name}</h2>
      <p className="scene-presenter__type-meta">
        Tipo contratual: <code>{scene.type}</code> · Ordem <strong>{scene.sort_order}</strong>
      </p>
      <dl className="scene-presenter__facts">
        <div>
          <dt>scene_id</dt>
          <dd>
            <code>{scene.scene_id}</code>
          </dd>
        </div>
        {scene.media_id ? (
          <div>
            <dt>media_id</dt>
            <dd>
              <code>{scene.media_id}</code>
            </dd>
          </div>
        ) : null}
        {scene.draw_config_id ? (
          <div>
            <dt>draw_config_id</dt>
            <dd>
              <code>{scene.draw_config_id}</code>
            </dd>
          </div>
        ) : null}
      </dl>
      {scene.type === "draw" && (
        <SceneDrawEngine scene={scene} drawConfig={drawConfig} onPlaybackLog={onPlaybackLog} />
      )}
      <SceneMediaRenderer
        scene={scene}
        mediaState={mediaState}
        workspaceRoot={workspaceRoot}
        bindings={bindings}
        mediaRequirement={mediaRequirement}
        onPlaybackLog={onPlaybackLog}
      />
    </div>
  );
}
