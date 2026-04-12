/**
 * Modelo da sessão de runtime do Player — fonte única de verdade operacional (MVP).
 * As views consomem selectors/ações; estado de apresentação (expandido, foco) fica local.
 */

import type { ExecutionLogEntry, ExecutionLogLevel } from "../execution/executionLog.js";
import type { PreflightResult } from "../preflight/types.js";
import type { PlayerAppState } from "../pack/playerPackState.js";
import type { PackLoaderSuccess } from "../pack/validateLoadedPack.js";

/** Estados internos do painel de sorteio (FSM do draw no store). */
export type DrawPanelState =
  | "idle"
  | "ready"
  | "drawing"
  | "result_generated"
  | "result_confirmed"
  | "error";

export type DrawRuntimeSlice = {
  /** `${scene_id}:${draw_config_id ?? ""}` em execução. */
  resetKey: string;
  panelState: DrawPanelState;
  /** Alvo do sorteio enquanto `drawing` — permite animação determinística no telão sem revelar resultado oficial. */
  pendingWinner: number | null;
  winnerValue: number | null;
  errorMessage: string | null;
};

export function criarSliceSorteioInicial(): DrawRuntimeSlice {
  return {
    resetKey: "",
    panelState: "idle",
    pendingWinner: null,
    winnerValue: null,
    errorMessage: null,
  };
}

/** Identificadores monótonos para invalidar efeitos assíncronos obsoletos (sorteio, mídia). */
export type OperationalContextIds = {
  executionId: number;
  sceneActivationId: number;
  drawAttemptId: number;
  mediaPlaybackId: number;
};

export const contextoOperacionalInicial: OperationalContextIds = {
  executionId: 0,
  sceneActivationId: 0,
  drawAttemptId: 0,
  mediaPlaybackId: 0,
};

export type RuntimeSessionState = {
  appState: PlayerAppState;
  drawRuntime: DrawRuntimeSlice;
  operationalContext: OperationalContextIds;
};

/** Subconjunto útil para UI — derivado de `appState` sem duplicar a FSM. */
export type ExecutionStatusModel = {
  fase: PlayerAppState["kind"];
  emExecucao: boolean;
  executionLog: ExecutionLogEntry[];
  sceneIndex: number;
};

export type RuntimeSessionDispatchAction =
  | { type: "CARREGAR_PACK_VALIDO"; packRoot: string; packData: PackLoaderSuccess }
  | { type: "BLOQUEAR_PACK"; mensagem: string }
  | { type: "SESSAO_DESCARREGAR" }
  | { type: "ATUALIZAR_WORKSPACE"; workspaceRoot: string | null; bindings: Record<string, string> }
  | { type: "ATUALIZAR_BINDINGS"; bindings: Record<string, string> }
  | { type: "APLICAR_RESULTADO_PREFLIGHT"; resultado: PreflightResult }
  | { type: "INICIAR_EXECUCAO"; drawResetKey: string; initialSceneIndex?: number }
  | { type: "CONCLUIR_EXECUCAO" }
  | { type: "ATIVAR_CENA"; indice: number; drawResetKey: string }
  | { type: "ANEXAR_LOG_EXECUCAO"; entrada: { level: ExecutionLogLevel; code: string; message: string } }
  | {
      type: "SINCRONIZAR_SORTEIO_ESTATICO";
      resetKey: string;
      panelState: DrawPanelState;
      errorMessage: string | null;
      winnerValue: number | null;
      pendingWinner?: number | null;
    }
  | { type: "SORTEIO_PARA_DESENHANDO"; pendingWinner: number }
  | { type: "SORTEIO_PARA_RESULTADO"; winnerValue: number }
  | { type: "SORTEIO_PARA_CONFIRMADO" }
  | { type: "SORTEIO_PARA_ERRO"; errorMessage: string }
  /** Volta o painel a «pronto» após resultado confirmado (novo sorteio na mesma cena). */
  | { type: "SORTEIO_PREPARAR_PRONTO" };

export const estadoSessaoRuntimeInicial: RuntimeSessionState = {
  appState: { kind: "idle" },
  drawRuntime: criarSliceSorteioInicial(),
  operationalContext: contextoOperacionalInicial,
};
