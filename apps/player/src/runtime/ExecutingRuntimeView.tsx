import type { DrawConfigContract, SceneContract } from "@telaflow/shared-contracts";
import { useMemo } from "react";
import type { PackLoaderSuccess } from "../pack/validateLoadedPack.js";
import { DrawRuntimeProvider } from "./drawRuntimeContext.js";
import { OperatorExecutingLayout } from "./OperatorExecutingLayout.js";
import { PublicSceneView } from "./PublicSceneView.js";
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

  const drawRuntimeResetKey = `${atual.scene_id}:${atual.draw_config_id ?? ""}`;

  return (
    <DrawRuntimeProvider resetKey={drawRuntimeResetKey}>
      <div className="player-exec-split-root">
        <section className="player-exec-public-shell" aria-label="Saída pública MVP">
          <p className="player-exec-public-shell__label">
            Saída pública (MVP) — pré-visualização no mesmo tela; dual-screen real fica para uma fase
            futura.
          </p>
          <PublicSceneView
            scene={atual}
            mediaState={mediaState}
            drawConfig={drawConfigResolved}
            workspaceRoot={workspaceRoot}
            bindings={bindings}
            mediaRequirement={mediaRequirement}
          />
        </section>

        <OperatorExecutingLayout
          ordenadas={ordenadas}
          sceneIndex={idx}
          scene={atual}
          mediaState={mediaState}
          drawConfig={drawConfigResolved}
          workspaceRoot={workspaceRoot}
          bindings={bindings}
          mediaRequirement={mediaRequirement}
          onSceneIndexChange={onSceneIndexChange}
          onFinishExecution={onFinishExecution}
          onPlaybackLog={onPlaybackLog}
        />
      </div>
    </DrawRuntimeProvider>
  );
}
