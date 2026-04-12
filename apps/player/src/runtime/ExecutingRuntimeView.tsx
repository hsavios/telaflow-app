import type { DrawConfigContract, SceneContract } from "@telaflow/shared-contracts";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OperatorExecutingLayout } from "./OperatorExecutingLayout.js";
import { PublicSceneView } from "./PublicSceneView.js";
import { PublicWindowSyncEmitter } from "./PublicWindowSyncEmitter.js";
import { planejarSincronizacaoEstaticaSorteio } from "./runtimeSessionDrawSync.js";
import { useRuntimeSession } from "./RuntimeSessionContext.js";
import { enabledScenesSorted } from "./sceneOrder.js";
import {
  resolveSceneMediaState,
  type SceneMediaDerivedState,
} from "./sceneMediaResolution.js";

type Props = {
  fileExistsCache: Map<string, boolean>;
};

export function ExecutingRuntimeView({ fileExistsCache }: Props) {
  const { seletores, acoes, comandos } = useRuntimeSession();
  const [publicWindowBusy, setPublicWindowBusy] = useState(false);

  const abrirJanelaPublica = useCallback(async () => {
    setPublicWindowBusy(true);
    try {
      await invoke("public_window_open");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(`Não foi possível abrir a janela pública: ${msg}`);
    } finally {
      setPublicWindowBusy(false);
    }
  }, []);

  const packData = seletores.loadedPack;
  const workspaceRoot = seletores.workspaceRoot;
  const bindings = seletores.mediaBindings;
  const sceneIndex = seletores.executionStatus.sceneIndex;

  const ordenadas = useMemo(
    () => (packData ? enabledScenesSorted(packData.event.scenes) : []),
    [packData],
  );
  const n = ordenadas.length;
  const idx = n > 0 ? Math.min(Math.max(0, sceneIndex), n - 1) : 0;
  const atual: SceneContract | null = n > 0 ? ordenadas[idx]! : null;

  const mediaRequirement = useMemo(() => {
    const mid = atual?.media_id;
    if (!mid || !packData) return null;
    return packData.mediaManifest.requirements.find((r) => r.media_id === mid) ?? null;
  }, [atual, packData]);

  const drawConfigResolved: DrawConfigContract | null = useMemo(() => {
    const did = atual?.draw_config_id;
    if (!did || !packData) return null;
    return packData.drawConfigs.draw_configs.find((d) => d.draw_config_id === did) ?? null;
  }, [atual, packData]);

  const drawBranding = useMemo(() => {
    if (!packData) return null;
    const t = packData.branding.tokens;
    return {
      primary_color: t.primary_color,
      accent_color: t.accent_color,
      font_family_sans: t.font_family_sans,
    };
  }, [packData]);

  const mediaState: SceneMediaDerivedState = atual
    ? resolveSceneMediaState(atual, workspaceRoot, bindings, fileExistsCache)
    : "no_media_required";

  const drawRuntimeResetKey = atual ? `${atual.scene_id}:${atual.draw_config_id ?? ""}` : "";

  useEffect(() => {
    if (!atual || atual.type !== "draw") return;
    const plano = planejarSincronizacaoEstaticaSorteio(atual, drawConfigResolved, drawRuntimeResetKey);
    acoes.sincronizarSorteioEstatico(plano);
  }, [acoes, atual, drawConfigResolved, drawRuntimeResetKey]);

  if (!packData) {
    return (
      <div className="player-exec-layout player-exec-layout--empty">
        <p className="player-hint">Pack indisponível.</p>
      </div>
    );
  }

  if (n === 0 || !atual) {
    return (
      <div className="player-exec-layout player-exec-layout--empty">
        <p className="player-hint">Sem cenas ativas no pack.</p>
        <div className="player-exec-ops">
          <button type="button" onClick={() => comandos.concluir_execucao()}>
            Concluir execução
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PublicWindowSyncEmitter fileExistsCache={fileExistsCache} />
      <div className="player-exec-split-root">
        <section className="player-exec-public-shell" aria-label="Saída pública (pré-visualização)">
          <div className="player-exec-public-shell__toolbar">
            <p className="player-exec-public-shell__label">
              Prévia do telão nesta janela. Abra a janela <strong>Telão</strong> no monitor do público — ela só mostra o palco, sem controles.
            </p>
            <button
              type="button"
              className="player-exec-public-shell__open-btn"
              disabled={publicWindowBusy}
              onClick={() => void abrirJanelaPublica()}
            >
              {publicWindowBusy ? "Abrindo…" : "Abrir janela do telão"}
            </button>
          </div>
          <PublicSceneView
            scene={atual}
            mediaState={mediaState}
            drawConfig={drawConfigResolved}
            workspaceRoot={workspaceRoot}
            bindings={bindings}
            mediaRequirement={mediaRequirement}
            drawBranding={drawBranding}
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
          packData={packData}
          fileExistsCache={fileExistsCache}
          onPlaybackLog={(entry) => acoes.anexarLogExecucao(entry)}
        />
      </div>
    </>
  );
}
