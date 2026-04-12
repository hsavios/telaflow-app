/**
 * Sincronização estática do painel de sorteio (sem I/O) — alinhada ao efeito anterior em `DrawScenePanel`.
 */

import type { DrawAttendeesPackFile, DrawConfigContract, SceneContract } from "@telaflow/shared-contracts";
import type { DrawPanelState } from "./runtimeSessionTypes.js";
import { validateDrawSceneNumberRange } from "./drawValidation.js";

export type PlanoSincronizacaoSorteio = {
  resetKey: string;
  panelState: DrawPanelState;
  errorMessage: string | null;
  winnerValue: number | null;
  pendingWinner: number | null;
};

export function planejarSincronizacaoEstaticaSorteio(
  scene: SceneContract,
  drawConfig: DrawConfigContract | null,
  resetKey: string,
  drawAttendees: DrawAttendeesPackFile | null,
): PlanoSincronizacaoSorteio {
  if (scene.type !== "draw") {
    return {
      resetKey,
      panelState: "idle",
      errorMessage: null,
      winnerValue: null,
      pendingWinner: null,
    };
  }
  if (!scene.draw_config_id) {
    return {
      resetKey,
      panelState: "error",
      errorMessage:
        "Esta cena de sorteio não tem identificador (draw_config_id). Corrija o export na Cloud.",
      winnerValue: null,
      pendingWinner: null,
    };
  }
  if (!drawConfig) {
    return {
      resetKey,
      panelState: "error",
      errorMessage:
        "A configuração deste sorteio não está neste pacote. Verifique draw-configs.json no export.",
      winnerValue: null,
      pendingWinner: null,
    };
  }
  if (drawConfig.draw_type !== "number_range" && drawConfig.draw_type !== "attendee_pool") {
    return {
      resetKey,
      panelState: "error",
      errorMessage: `Tipo de sorteio não suportado: ${drawConfig.draw_type}.`,
      winnerValue: null,
      pendingWinner: null,
    };
  }
  const v = validateDrawSceneNumberRange(scene, drawConfig, drawAttendees);
  if (!v.ok) {
    return {
      resetKey,
      panelState: "error",
      errorMessage: v.reason,
      winnerValue: null,
      pendingWinner: null,
    };
  }
  return {
    resetKey,
    panelState: "ready",
    errorMessage: null,
    winnerValue: null,
    pendingWinner: null,
  };
}
