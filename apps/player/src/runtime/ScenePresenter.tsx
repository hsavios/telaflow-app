import type { SceneContract, SceneType } from "@telaflow/shared-contracts";
import type { SceneMediaDerivedState } from "./sceneMediaResolution.js";
import { describeSceneMediaDerivedStatePt } from "./sceneMediaResolution.js";

const TYPE_LABELS: Record<SceneType, string> = {
  opening: "Abertura",
  institutional: "Institucional",
  sponsor: "Patrocinador",
  draw: "Sorteio",
  break: "Intervalo",
  closing: "Encerramento",
};

type Props = {
  scene: SceneContract;
  sceneOrdinal: number;
  sceneTotal: number;
  mediaState: SceneMediaDerivedState;
  drawConfigSummary?: string | null;
};

export function ScenePresenter({
  scene,
  sceneOrdinal,
  sceneTotal,
  mediaState,
  drawConfigSummary,
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
      {scene.type === "draw" && (
        <p className="scene-presenter__draw-hint">
          Cena de sorteio (MVP): sem animação nem extração real.
          {drawConfigSummary ? <> {drawConfigSummary}</> : null}
        </p>
      )}
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
      <footer className={`scene-presenter__media scene-presenter__media--${mediaState}`}>
        <strong>Mídia (estado derivado)</strong>
        <p>{describeSceneMediaDerivedStatePt(mediaState)}</p>
      </footer>
    </div>
  );
}
