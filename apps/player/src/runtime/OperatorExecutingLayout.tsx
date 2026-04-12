/**
 * Layout da visão do operador em execução: roteiro, palco (ScenePresenter) e painel de operação.
 * Separado da saída pública para evoluir para dual-screen sem misturar componentes.
 */

import type {
  DrawConfigContract,
  MediaRequirementContract,
  SceneContract,
} from "@telaflow/shared-contracts";
import { describeOperationalKindPt } from "./operationalState.js";
import { ScenePresenter } from "./ScenePresenter.js";
import type { SceneMediaDerivedState } from "./sceneMediaResolution.js";

type PlaybackLogPayload = {
  level: "info" | "warn" | "error";
  code: string;
  message: string;
};

type Props = {
  ordenadas: SceneContract[];
  sceneIndex: number;
  scene: SceneContract;
  mediaState: SceneMediaDerivedState;
  drawConfig: DrawConfigContract | null;
  workspaceRoot: string | null;
  bindings: Record<string, string>;
  mediaRequirement: MediaRequirementContract | null;
  onSceneIndexChange: (next: number) => void;
  onFinishExecution: () => void;
  onPlaybackLog: (entry: PlaybackLogPayload) => void;
};

export function OperatorExecutingLayout({
  ordenadas,
  sceneIndex,
  scene,
  mediaState,
  drawConfig,
  workspaceRoot,
  bindings,
  mediaRequirement,
  onSceneIndexChange,
  onFinishExecution,
  onPlaybackLog,
}: Props) {
  const n = ordenadas.length;
  const idx = sceneIndex;
  const prev = () => onSceneIndexChange(Math.max(0, idx - 1));
  const next = () => onSceneIndexChange(Math.min(n - 1, idx + 1));

  return (
    <div className="player-exec-layout player-exec-layout--operator">
      <aside className="player-exec-sidebar" aria-label="Roteiro">
        <h3 className="player-exec-sidebar__title">Roteiro</h3>
        <ol className="player-exec-script">
          {ordenadas.map((sc, i) => (
            <li key={sc.scene_id}>
              <button
                type="button"
                className={
                  i === idx ? "player-exec-script__btn is-current" : "player-exec-script__btn"
                }
                onClick={() => onSceneIndexChange(i)}
              >
                <span className="player-exec-script__name">{sc.name}</span>
                <span className="player-exec-script__meta">
                  <code>{sc.type}</code> · ordem {sc.sort_order}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <div className="player-exec-stage">
        <ScenePresenter
          scene={scene}
          sceneOrdinal={idx + 1}
          sceneTotal={n}
          mediaState={mediaState}
          drawConfig={drawConfig}
          workspaceRoot={workspaceRoot}
          bindings={bindings}
          mediaRequirement={mediaRequirement}
          onPlaybackLog={onPlaybackLog}
        />
      </div>

      <aside className="player-exec-ops" aria-label="Controle operacional">
        <h3 className="player-exec-ops__title">Operação</h3>
        <p className="player-exec-ops__state">
          <span className="player-exec-ops__label">Estado</span>
          <code className="player-exec-ops__code">executing</code>
        </p>
        <p className="player-exec-ops__hint">{describeOperationalKindPt("executing")}</p>
        <div className="player-exec-ops__nav">
          <button type="button" disabled={idx <= 0} onClick={prev}>
            Anterior
          </button>
          <button type="button" disabled={idx >= n - 1} onClick={next}>
            Seguinte
          </button>
        </div>
        <button type="button" className="player-exec-ops__finish" onClick={onFinishExecution}>
          Concluir execução
        </button>
      </aside>
    </div>
  );
}
