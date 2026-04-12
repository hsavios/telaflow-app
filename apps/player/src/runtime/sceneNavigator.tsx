/**
 * Navegação mínima pelo roteiro exportado (ordem sort_order + scene_id).
 * Sem playback de mídia nem execução de lógica de cena.
 */

import type { SceneContract } from "@telaflow/shared-contracts";
import { useMemo } from "react";

type Props = {
  scenes: SceneContract[];
  sceneIndex: number;
  onSceneIndexChange: (next: number) => void;
};

export function SceneRuntimeNav({ scenes, sceneIndex, onSceneIndexChange }: Props) {
  const ordenadas = useMemo(
    () =>
      [...scenes].sort((a, b) => {
        const o = a.sort_order - b.sort_order;
        return o !== 0 ? o : a.scene_id.localeCompare(b.scene_id);
      }),
    [scenes],
  );

  const n = ordenadas.length;
  const atual = n > 0 ? ordenadas[Math.min(sceneIndex, n - 1)] : null;

  const prev = () => onSceneIndexChange(Math.max(0, sceneIndex - 1));
  const next = () => onSceneIndexChange(Math.min(n - 1, sceneIndex + 1));

  if (n === 0) {
    return <p className="player-hint">Sem cenas no pack.</p>;
  }

  return (
    <div className="player-scene-nav">
      <p>
        <strong>Cena</strong> {sceneIndex + 1} / {n}
      </p>
      {atual && (
        <dl className="player-summary">
          <div>
            <dt>Nome</dt>
            <dd>{atual.name}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>
              <code>{atual.type}</code>
            </dd>
          </div>
          <div>
            <dt>scene_id</dt>
            <dd>
              <code>{atual.scene_id}</code>
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
