import type { DrawConfigContract, SceneContract } from "@telaflow/shared-contracts";
import { useMemo } from "react";
import type { PackLoaderSuccess } from "../pack/validateLoadedPack.js";
import { describeOperationalKindPt } from "./operationalState.js";
import { ScenePresenter } from "./ScenePresenter.js";
import { enabledScenesSorted } from "./sceneOrder.js";
import {
  resolveSceneMediaState,
  type SceneMediaDerivedState,
} from "./sceneMediaResolution.js";

type PlaybackLogPayload = {
  level: "info" | "warn" | "error";
  code: string;
  message: string;
};

type Props = {
  packData: PackLoaderSuccess;
  sceneIndex: number;
  workspaceRoot: string | null;
  bindings: Record<string, string>;
  fileExistsCache: Map<string, boolean>;
  onSceneIndexChange: (next: number) => void;
  onFinishExecution: () => void;
  onPlaybackLog: (entry: PlaybackLogPayload) => void;
};

export function ExecutingRuntimeView({
  packData,
  sceneIndex,
  workspaceRoot,
  bindings,
  fileExistsCache,
  onSceneIndexChange,
  onFinishExecution,
  onPlaybackLog,
}: Props) {
  const ordenadas = useMemo(() => enabledScenesSorted(packData.event.scenes), [packData.event.scenes]);
  const n = ordenadas.length;
  const idx = n > 0 ? Math.min(Math.max(0, sceneIndex), n - 1) : 0;
  const atual: SceneContract | null = n > 0 ? ordenadas[idx]! : null;

  const mediaRequirement = useMemo(() => {
    const mid = atual?.media_id;
    if (!mid) return null;
    return packData.mediaManifest.requirements.find((r) => r.media_id === mid) ?? null;
  }, [atual, packData.mediaManifest.requirements]);

  const drawConfigResolved: DrawConfigContract | null = useMemo(() => {
    const did = atual?.draw_config_id;
    if (!did) return null;
    return packData.drawConfigs.draw_configs.find((d) => d.draw_config_id === did) ?? null;
  }, [atual, packData.drawConfigs.draw_configs]);

  const mediaState: SceneMediaDerivedState = atual
    ? resolveSceneMediaState(atual, workspaceRoot, bindings, fileExistsCache)
    : "no_media_required";

  const prev = () => onSceneIndexChange(Math.max(0, idx - 1));
  const next = () => onSceneIndexChange(Math.min(n - 1, idx + 1));

  if (n === 0 || !atual) {
    return (
      <div className="player-exec-layout player-exec-layout--empty">
        <p className="player-hint">Sem cenas ativas no pack.</p>
        <div className="player-exec-ops">
          <button type="button" onClick={onFinishExecution}>
            Concluir execução
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="player-exec-layout">
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
          scene={atual}
          sceneOrdinal={idx + 1}
          sceneTotal={n}
          mediaState={mediaState}
          drawConfig={drawConfigResolved}
          workspaceRoot={workspaceRoot}
          bindings={bindings}
          mediaRequirement={mediaRequirement}
          onPlaybackLog={onPlaybackLog}
        />
      </div>

      <aside className="player-exec-ops" aria-label="Controlo operacional">
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
