/**
 * Bridge Tauri entre a janela do operador e a webview `public`.
 * Snapshot só leitura, derivado do Runtime Session Store — a janela pública nunca altera estado.
 */

import type {
  DrawAttendeesPackFile,
  DrawConfigContract,
  MediaRequirementContract,
  SceneContract,
} from "@telaflow/shared-contracts";
import { emitTo } from "@tauri-apps/api/event";
import { isActiveSession, type PlayerAppState } from "../pack/playerPackState.js";
import { enabledScenesSorted } from "./sceneOrder.js";
import {
  resolveSceneMediaState,
  type SceneMediaDerivedState,
} from "./sceneMediaResolution.js";
import type { DrawPanelState, RuntimeSessionState } from "./runtimeSessionTypes.js";

/** Nome estável do evento Tauri entre webviews. */
export const PUBLIC_WINDOW_STATE_EVENT = "telaflow-public-state";

/** Subconjunto JSON-seguro de `PlayerAppState` para o telão (sem pack completo). */
export type PublicWindowAppStateSnapshot =
  | { kind: "idle" }
  | { kind: "blocked"; message: string }
  | { kind: "pack_loaded" }
  | { kind: "preflight_failed" }
  | { kind: "ready" }
  | { kind: "executing" };

export type PublicWindowDrawSnapshot = {
  resetKey: string;
  panelState: DrawPanelState;
  pendingWinner: number | null;
  winnerValue: number | null;
  errorMessage: string | null;
  drawAttemptId: number;
};

/** Tokens mínimos de `branding.json` do pack para o telão (JSON-seguro). */
export type PublicWindowDrawBranding = {
  primary_color: string;
  accent_color: string;
  font_family_sans: string;
};

/**
 * Snapshot derivado do store para a janela pública (somente leitura).
 * Inclui tudo o que `PublicSceneView` precisa em modo remoto.
 */
export type PublicWindowOperatorSnapshot = {
  appState: PublicWindowAppStateSnapshot;
  activeSceneId: string | null;
  activeScene: SceneContract | null;
  drawRuntime: PublicWindowDrawSnapshot | null;
  /** Branding do pack quando em execução; o telão aplica em sorteio / UI pública. */
  drawBranding: PublicWindowDrawBranding | null;
  mediaState: SceneMediaDerivedState;
  drawConfig: DrawConfigContract | null;
  /** Inscritos/números empacotados (opcional) — necessário para limites de animação coerentes. */
  drawAttendees: DrawAttendeesPackFile | null;
  workspaceRoot: string | null;
  bindings: Record<string, string>;
  mediaRequirement: MediaRequirementContract | null;
  eventName: string | null;
};

function paraSnapshotAppStatePublico(app: PlayerAppState): PublicWindowAppStateSnapshot {
  switch (app.kind) {
    case "idle":
      return { kind: "idle" };
    case "blocked":
      return { kind: "blocked", message: app.message };
    case "pack_loaded":
    case "preflight_failed":
    case "ready":
    case "executing":
      return { kind: app.kind };
    default:
      return { kind: "idle" };
  }
}

function indiceCenaSeguro(ordenadas: SceneContract[], sceneIndex: number): number {
  const n = ordenadas.length;
  if (n === 0) return 0;
  return Math.min(Math.max(0, sceneIndex), n - 1);
}

/**
 * Deriva o snapshot a partir do estado consolidado da sessão (operador).
 * Não tem efeitos colaterais.
 */
export function derivarSnapshotJanelaPublica(
  estado: RuntimeSessionState,
  fileExistsCache: Map<string, boolean>,
): PublicWindowOperatorSnapshot {
  const app = estado.appState;
  const appSnap = paraSnapshotAppStatePublico(app);
  const draw = estado.drawRuntime;

  const workspaceRoot = isActiveSession(app) ? app.workspaceRoot : null;
  const bindings = isActiveSession(app) ? { ...app.bindings } : {};
  const eventName = isActiveSession(app) ? app.packData.event.name : null;

  if (!isActiveSession(app) || app.kind !== "executing") {
    return {
      appState: appSnap,
      activeSceneId: null,
      activeScene: null,
      mediaState: "no_media_required",
      drawRuntime: null,
      drawBranding: null,
      drawConfig: null,
      drawAttendees: null,
      workspaceRoot,
      bindings,
      mediaRequirement: null,
      eventName,
    };
  }

  const pack = app.packData;
  const bt = pack.branding.tokens;
  const drawBranding: PublicWindowDrawBranding = {
    primary_color: bt.primary_color,
    accent_color: bt.accent_color,
    font_family_sans: bt.font_family_sans,
  };
  const ordenadas = enabledScenesSorted(pack.event.scenes);
  const n = ordenadas.length;
  const idx = indiceCenaSeguro(ordenadas, app.sceneIndex);
  const activeScene = n > 0 ? ordenadas[idx]! : null;

  if (!activeScene) {
    return {
      appState: appSnap,
      activeSceneId: null,
      activeScene: null,
      mediaState: "no_media_required",
      drawRuntime: null,
      drawBranding,
      drawConfig: null,
      drawAttendees: pack.drawAttendees ?? null,
      workspaceRoot,
      bindings,
      mediaRequirement: null,
      eventName,
    };
  }

  const mid = activeScene.media_id;
  const mediaRequirement =
    mid != null && String(mid).trim() !== ""
      ? pack.mediaManifest.requirements.find((r) => r.media_id === mid) ?? null
      : null;

  const did = activeScene.draw_config_id;
  const drawConfig = did
    ? pack.drawConfigs.draw_configs.find((d) => d.draw_config_id === did) ?? null
    : null;

  const mediaState = resolveSceneMediaState(activeScene, workspaceRoot, bindings, fileExistsCache);

  const drawRuntime: PublicWindowDrawSnapshot | null =
    activeScene.type === "draw"
      ? {
          resetKey: draw.resetKey,
          panelState: draw.panelState,
          pendingWinner: draw.pendingWinner,
          winnerValue: draw.winnerValue,
          errorMessage: draw.errorMessage,
          drawAttemptId: estado.operationalContext.drawAttemptId,
        }
      : null;

  return {
    appState: appSnap,
    activeSceneId: activeScene.scene_id,
    activeScene,
    mediaState,
    drawRuntime,
    drawBranding,
    drawConfig,
    drawAttendees: pack.drawAttendees ?? null,
    workspaceRoot,
    bindings,
    mediaRequirement,
    eventName,
  };
}

/** Envia o snapshot para a webview `public` (ignora falha se a janela não existir). */
export function emitirSnapshotJanelaPublica(snapshot: PublicWindowOperatorSnapshot): Promise<void> {
  return emitTo("public", PUBLIC_WINDOW_STATE_EVENT, snapshot).catch(() => undefined);
}
