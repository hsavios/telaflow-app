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
import { DrawExperienceV1 } from "./draw/drawPresentation.js";
import { effectiveNumberRange } from "./drawNumberRange.js";
import { SceneMediaRenderer } from "./SceneMediaRenderer.js";
import type { SceneMediaDerivedState } from "./sceneMediaResolution.js";
import { fraseMomentoCenaPt } from "./sceneRuntimeUi.js";
import { useDrawRuntime } from "./drawRuntimeContext.js";
import type { PublicWindowDrawBranding, PublicWindowDrawSnapshot } from "./publicWindowBridge.js";

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
  /** Branding do pack (telão / prévia pública). */
  drawBranding?: PublicWindowDrawBranding | null;
};

/** Sem logs de execução a partir da janela pública (operador mantém o registro JSONL). */
function noopPlaybackLog(_entry: PlaybackLogPayload) {}

function publicDrawUnavailable() {
  return (
    <div className="public-scene-view__draw public-scene-view__draw--muted" role="status">
      <p>Sorteio indisponível neste momento.</p>
    </div>
  );
}

function publicDrawExperience(
  drawConfig: DrawConfigContract,
  snap: Pick<
    PublicWindowDrawSnapshot,
    | "resetKey"
    | "panelState"
    | "pendingWinner"
    | "winnerValue"
    | "errorMessage"
    | "drawAttemptId"
  >,
  drawBranding: PublicWindowDrawBranding | null | undefined,
) {
  const { min, max } = effectiveNumberRange(drawConfig);
  const publicCopy = drawConfig.public_copy;
  const resultLabel = publicCopy?.result_label?.trim() || "Número sorteado";
  const audienceHint = publicCopy?.audience_instructions?.trim() ?? null;

  return (
    <DrawExperienceV1
      variant="telao"
      panelState={snap.panelState}
      winnerValue={snap.winnerValue}
      pendingWinner={snap.pendingWinner}
      errorMessage={snap.errorMessage}
      resetKey={snap.resetKey}
      drawAttemptId={snap.drawAttemptId}
      min={min}
      max={max}
      drawName={drawConfig.name ?? ""}
      audienceHint={audienceHint}
      resultLabel={resultLabel}
      soundEnabled
      branding={drawBranding ?? null}
    />
  );
}

function PublicDrawMirrorFromContext({
  scene,
  drawConfig,
  drawBranding,
}: {
  scene: SceneContract;
  drawConfig: DrawConfigContract | null;
  drawBranding?: PublicWindowDrawBranding | null;
}) {
  const snap = useDrawRuntime();
  if (!scene.draw_config_id || !drawConfig || drawConfig.draw_type !== "number_range") {
    return publicDrawUnavailable();
  }
  return publicDrawExperience(drawConfig, snap, drawBranding);
}

function PublicDrawMirrorRemote({
  scene,
  drawConfig,
  snapshot,
  drawBranding,
}: {
  scene: SceneContract;
  drawConfig: DrawConfigContract | null;
  snapshot: PublicWindowDrawSnapshot;
  drawBranding?: PublicWindowDrawBranding | null;
}) {
  if (!scene.draw_config_id || !drawConfig || drawConfig.draw_type !== "number_range") {
    return publicDrawUnavailable();
  }
  return publicDrawExperience(drawConfig, snapshot, drawBranding);
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
  drawBranding = null,
}: Props) {
  const typeLabel = TYPE_LABELS_PUBLIC[scene.type] ?? scene.type;

  const emptySnap: PublicWindowDrawSnapshot = {
    resetKey: "",
    panelState: "idle",
    pendingWinner: null,
    winnerValue: null,
    errorMessage: null,
    drawAttemptId: 0,
  };

  const momento = fraseMomentoCenaPt(scene.type);
  const articleClass =
    scene.type === "draw"
      ? "public-scene-view public-scene-view--draw-stage"
      : `public-scene-view public-scene-view--kind-${scene.type}`;

  return (
    <article className={articleClass} aria-label="Saída pública — cena atual">
      <header className="public-scene-view__header">
        <p className="public-scene-view__kind">{typeLabel}</p>
        <h1 className="public-scene-view__title">{scene.name}</h1>
        {scene.type !== "draw" && momento ? (
          <p className="public-scene-view__atmosphere">{momento}</p>
        ) : null}
        {scene.type === "draw" && drawConfig?.public_copy?.headline ? (
          <p className="public-scene-view__headline">{drawConfig.public_copy.headline}</p>
        ) : null}
      </header>

      {scene.type === "draw" ? (
        <div className="public-scene-view__draw-premium-shell">
          {drawMirrorMode === "remote" ? (
            <PublicDrawMirrorRemote
              scene={scene}
              drawConfig={drawConfig}
              snapshot={remoteDrawSnapshot ?? emptySnap}
              drawBranding={drawBranding}
            />
          ) : (
            <PublicDrawMirrorFromContext scene={scene} drawConfig={drawConfig} drawBranding={drawBranding} />
          )}
        </div>
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
