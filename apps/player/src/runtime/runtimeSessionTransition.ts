/**
 * Transições puras da sessão de runtime (FSM + slice de sorteio + contexto operacional).
 * Persistência JSONL fica nos wrappers do `RuntimeSessionContext`.
 */

import {
  appendExecutionLog,
  EXECUTION_LOG_CODES,
} from "../execution/executionLog.js";
import {
  isActiveSession,
  type PlayerActiveSession,
  type PlayerAppState,
} from "../pack/playerPackState.js";
import { kindAfterPreflight } from "./operationalState.js";
import { mensagemAtivacaoCena } from "./runtimeSessionSceneActivation.js";
import {
  contextoOperacionalInicial,
  criarSliceSorteioInicial,
  type RuntimeSessionDispatchAction,
  type RuntimeSessionState,
} from "./runtimeSessionTypes.js";

function preflightPodeCorrer(s: PlayerAppState): s is PlayerActiveSession {
  return (
    isActiveSession(s) &&
    (s.kind === "pack_loaded" || s.kind === "preflight_failed" || s.kind === "ready")
  );
}

export function transicionarSessaoRuntime(
  prev: RuntimeSessionState,
  action: RuntimeSessionDispatchAction,
): RuntimeSessionState {
  const app = prev.appState;
  const oc = prev.operationalContext;

  switch (action.type) {
    case "CARREGAR_PACK_VALIDO":
      return {
        appState: {
          kind: "pack_loaded",
          packRoot: action.packRoot,
          packData: action.packData,
          workspaceRoot: null,
          bindings: {},
          lastPreflight: null,
          sceneIndex: 0,
          executionLog: [],
        },
        drawRuntime: criarSliceSorteioInicial(),
        operationalContext: contextoOperacionalInicial,
      };

    case "BLOQUEAR_PACK":
      return {
        appState: { kind: "blocked", message: action.mensagem },
        drawRuntime: criarSliceSorteioInicial(),
        operationalContext: contextoOperacionalInicial,
      };

    case "SESSAO_DESCARREGAR":
      return {
        appState: { kind: "idle" },
        drawRuntime: criarSliceSorteioInicial(),
        operationalContext: contextoOperacionalInicial,
      };

    case "ATUALIZAR_WORKSPACE": {
      if (!isActiveSession(app)) return prev;
      return {
        appState: {
          kind: "pack_loaded",
          packRoot: app.packRoot,
          packData: app.packData,
          workspaceRoot: action.workspaceRoot,
          bindings: action.bindings,
          lastPreflight: null,
          sceneIndex: 0,
          executionLog: [],
        },
        drawRuntime: criarSliceSorteioInicial(),
        operationalContext: contextoOperacionalInicial,
      };
    }

    case "ATUALIZAR_BINDINGS": {
      if (!isActiveSession(app)) return prev;
      return {
        appState: {
          kind: "pack_loaded",
          packRoot: app.packRoot,
          packData: app.packData,
          workspaceRoot: app.workspaceRoot,
          bindings: action.bindings,
          lastPreflight: null,
          sceneIndex: 0,
          executionLog: [],
        },
        drawRuntime: criarSliceSorteioInicial(),
        operationalContext: contextoOperacionalInicial,
      };
    }

    case "APLICAR_RESULTADO_PREFLIGHT": {
      if (!preflightPodeCorrer(app)) return prev;
      const gate = kindAfterPreflight(action.resultado);
      if (gate === "ready") {
        return {
          appState: {
            kind: "ready",
            packRoot: app.packRoot,
            packData: app.packData,
            workspaceRoot: app.workspaceRoot,
            bindings: app.bindings,
            lastPreflight: action.resultado,
            sceneIndex: 0,
            executionLog: [],
          },
          drawRuntime: criarSliceSorteioInicial(),
          operationalContext: contextoOperacionalInicial,
        };
      }
      return {
        appState: {
          kind: "preflight_failed",
          packRoot: app.packRoot,
          packData: app.packData,
          workspaceRoot: app.workspaceRoot,
          bindings: app.bindings,
          lastPreflight: action.resultado,
          sceneIndex: 0,
          executionLog: [],
        },
        drawRuntime: criarSliceSorteioInicial(),
        operationalContext: contextoOperacionalInicial,
      };
    }

    case "INICIAR_EXECUCAO": {
      if (app.kind !== "ready") return prev;
      const started = appendExecutionLog([], {
        level: "info",
        code: EXECUTION_LOG_CODES.EXECUTION_STARTED,
        message: `Execução iniciada (export ${app.packData.manifest.export_id}).`,
      });
      const withScene = appendExecutionLog(started, {
        level: "info",
        code: EXECUTION_LOG_CODES.SCENE_ACTIVATED,
        message: mensagemAtivacaoCena(app.packData, 0),
      });
      return {
        appState: {
          kind: "executing",
          packRoot: app.packRoot,
          packData: app.packData,
          workspaceRoot: app.workspaceRoot,
          bindings: app.bindings,
          lastPreflight: app.lastPreflight,
          sceneIndex: 0,
          executionLog: withScene,
        },
        drawRuntime: {
          resetKey: action.drawResetKey,
          panelState: "idle",
          pendingWinner: null,
          winnerValue: null,
          errorMessage: null,
        },
        operationalContext: {
          executionId: oc.executionId + 1,
          sceneActivationId: oc.sceneActivationId + 1,
          mediaPlaybackId: oc.mediaPlaybackId + 1,
          drawAttemptId: 0,
        },
      };
    }

    case "CONCLUIR_EXECUCAO": {
      if (app.kind !== "executing") return prev;
      return {
        appState: {
          kind: "ready",
          packRoot: app.packRoot,
          packData: app.packData,
          workspaceRoot: app.workspaceRoot,
          bindings: app.bindings,
          lastPreflight: app.lastPreflight,
          sceneIndex: 0,
          executionLog: [],
        },
        drawRuntime: criarSliceSorteioInicial(),
        operationalContext: contextoOperacionalInicial,
      };
    }

    case "ATIVAR_CENA": {
      if (app.kind !== "executing") return prev;
      const row = appendExecutionLog(app.executionLog, {
        level: "info",
        code: EXECUTION_LOG_CODES.SCENE_ACTIVATED,
        message: mensagemAtivacaoCena(app.packData, action.indice),
      });
      return {
        appState: {
          ...app,
          sceneIndex: action.indice,
          executionLog: row,
        },
        drawRuntime: {
          resetKey: action.drawResetKey,
          panelState: "idle",
          pendingWinner: null,
          winnerValue: null,
          errorMessage: null,
        },
        operationalContext: {
          ...oc,
          sceneActivationId: oc.sceneActivationId + 1,
          mediaPlaybackId: oc.mediaPlaybackId + 1,
          drawAttemptId: 0,
        },
      };
    }

    case "ANEXAR_LOG_EXECUCAO": {
      if (app.kind !== "executing") return prev;
      const row = appendExecutionLog(app.executionLog, action.entrada);
      return {
        ...prev,
        appState: { ...app, executionLog: row },
      };
    }

    case "SINCRONIZAR_SORTEIO_ESTATICO": {
      if (prev.drawRuntime.resetKey !== action.resetKey) return prev;
      return {
        ...prev,
        drawRuntime: {
          resetKey: action.resetKey,
          panelState: action.panelState,
          errorMessage: action.errorMessage,
          winnerValue: action.winnerValue,
          pendingWinner: action.pendingWinner ?? null,
        },
      };
    }

    case "SORTEIO_PARA_DESENHANDO":
      return {
        ...prev,
        drawRuntime: {
          ...prev.drawRuntime,
          panelState: "drawing",
          pendingWinner: action.pendingWinner,
        },
        operationalContext: {
          ...oc,
          drawAttemptId: oc.drawAttemptId + 1,
        },
      };

    case "SORTEIO_PARA_RESULTADO":
      return {
        ...prev,
        drawRuntime: {
          ...prev.drawRuntime,
          panelState: "result_generated",
          winnerValue: action.winnerValue,
          pendingWinner: null,
        },
      };

    case "SORTEIO_PARA_CONFIRMADO":
      return {
        ...prev,
        drawRuntime: { ...prev.drawRuntime, panelState: "result_confirmed" },
      };

    case "SORTEIO_PARA_ERRO":
      return {
        ...prev,
        drawRuntime: {
          ...prev.drawRuntime,
          panelState: "error",
          errorMessage: action.errorMessage,
          pendingWinner: null,
        },
      };
  }
}
