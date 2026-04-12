/**
 * Scene Runtime MVP — cenas ativas (`enabled`) ordenadas por `event.json`.
 * Sem playback de mídia nem sorteio visual.
 */

import type { SceneContract } from "@telaflow/shared-contracts";
import { useMemo } from "react";

type Props = {
  scenes: SceneContract[];
  sceneIndex: number;
  onSceneIndexChange: (next: number) => void;
};

function cenasAtivasOrdenadas(scenes: SceneContract[]): SceneContract[] {
  return [...scenes]
    .filter((s) => s.enabled)
    .sort((a, b) => {
      const o = a.sort_order - b.sort_order;
      return o !== 0 ? o : a.scene_id.localeCompare(b.scene_id);
    });
}

export function SceneRuntimeNav({ scenes, sceneIndex, onSceneIndexChange }: Props) {
  const ordenadas = useMemo(() => cenasAtivasOrdenadas(scenes), [scenes]);

  const n = ordenadas.length;
  const atual = n > 0 ? ordenadas[Math.min(sceneIndex, n - 1)] : null;

  const prev = () => onSceneIndexChange(Math.max(0, sceneIndex - 1));
  const next = () => onSceneIndexChange(Math.min(n - 1, sceneIndex + 1));

  if (n === 0) {
    return <p className="player-hint">Sem cenas ativas no pack.</p>;
  }

  return (
    <div className="player-scene-nav">
      <div className="player-scene-list-wrap">
        <h4>Roteiro (ativas)</h4>
        <ol className="player-scene-list">
          {ordenadas.map((sc, i) => (
            <li
              key={sc.scene_id}
              className={i === sceneIndex ? "player-scene-list-item is-current" : "player-scene-list-item"}
            >
              <strong>{sc.name}</strong>{" "}
              <span className="player-scene-list-meta">
                (<code>{sc.type}</code>, ordem {sc.sort_order})
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p>
        <strong>Cena atual</strong> ({sceneIndex + 1} / {n})
      </p>
      {atual && (
        <dl className="player-summary">
          <div>
            <dt>scene_id</dt>
            <dd>
              <code>{atual.scene_id}</code>
            </dd>
          </div>
          <div>
            <dt>name</dt>
            <dd>{atual.name}</dd>
          </div>
          <div>
            <dt>type</dt>
            <dd>
              <code>{atual.type}</code>
            </dd>
          </div>
          <div>
            <dt>sort_order</dt>
            <dd>{atual.sort_order}</dd>
          </div>
          <div>
            <dt>media_id</dt>
            <dd>
              <code>{atual.media_id ?? "—"}</code>
            </dd>
          </div>
          <div>
            <dt>draw_config_id</dt>
            <dd>
              <code>{atual.draw_config_id ?? "—"}</code>
            </dd>
          </div>
        </dl>
      )}
      <div className="player-scene-nav-actions">
        <button type="button" disabled={sceneIndex <= 0} onClick={prev}>
          Cena anterior
        </button>
        <button type="button" disabled={sceneIndex >= n - 1} onClick={next}>
          Cena seguinte
        </button>
      </div>
    </div>
  );
}
