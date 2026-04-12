/**
 * Contexto da sessão de runtime — fonte única de verdade operacional e ações explícitas (pt-BR).
 */

import type { DrawConfigContract, SceneContract } from "@telaflow/shared-contracts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  appendExecutionLog,
  EXECUTION_LOG_CODES,
  toJsonlLine,
  type ExecutionLogEntry,
  type ExecutionLogLevel,
} from "../execution/executionLog.js";
import { persistExecutionJsonl } from "../execution/persistExecutionLog.js";
import { isActiveSession, type PlayerActiveSession } from "../pack/playerPackState.js";
import type { PackLoaderSuccess } from "../pack/validateLoadedPack.js";
import type { PreflightResult } from "../preflight/types.js";
import { appendDrawHistoryEntry } from "./draw/drawHistory.js";
import {
  buildDrawSpinSchedule,
  spinScheduleSeed,
  spinScheduleTotalDuration,
} from "./draw/drawEngine.js";
import { effectiveNumberRange, randomIntInclusive } from "./drawNumberRange.js";
import { validateDrawSceneNumberRange } from "./drawValidation.js";
import { enabledScenesSorted } from "./sceneOrder.js";
import type { ComandoOperacionalResultado } from "./commands/commandPolicy.js";
import { createRuntimeCommandExecutor, type ComandosRuntimeSafety } from "./commands/commandExecutor.js";
import { drawAttemptCorresponde } from "./commands/runtimeEpochs.js";
import { transicionarSessaoRuntime } from "./runtimeSessionTransition.js";
import { seletoresSessaoRuntime, type RuntimeSessionSelectors } from "./runtimeSessionSelectors.js";
import {
  estadoSessaoRuntimeInicial,
  type DrawPanelState,
  type RuntimeSessionDispatchAction,
  type RuntimeSessionState,
} from "./runtimeSessionTypes.js";

function caminhoBaseLog(s: PlayerActiveSession): string {
  return (s.workspaceRoot && s.workspaceRoot.trim()) || s.packRoot;
}

function persistirLinhaLog(s: PlayerActiveSession, entrada: ExecutionLogEntry): void {
  void persistExecutionJsonl(caminhoBaseLog(s), toJsonlLine(entrada));
}

function persistirSeNovoLogExecucao(prev: RuntimeSessionState, next: RuntimeSessionState): void {
  if (next.appState.kind !== "executing") return;
  const prevLen = prev.appState.kind === "executing" ? prev.appState.executionLog.length : 0;
  const nextLen = next.appState.executionLog.length;
  if (nextLen > prevLen) {
    for (let i = prevLen; i < nextLen; i++) {
      persistirLinhaLog(next.appState, next.appState.executionLog[i]!);
    }
  }
}

function chaveResetSorteioCena(scene: SceneContract): string {
  return `${scene.scene_id}:${scene.draw_config_id ?? ""}`;
}

export type AcoesSessaoRuntime = {
  carregarPackValido: (packRoot: string, packData: PackLoaderSuccess) => void;
  bloquearPack: (mensagem: string) => void;
  sessaoDescarregar: () => void;
  atualizarWorkspace: (workspaceRoot: string | null, bindings: Record<string, string>) => void;
  atualizarBindings: (bindings: Record<string, string>) => void;
  aplicarResultadoPreflight: (resultado: PreflightResult) => void;
  anexarLogExecucao: (entrada: { level: ExecutionLogLevel; code: string; message: string }) => void;
  sincronizarSorteioEstatico: (payload: {
    resetKey: string;
    panelState: DrawPanelState;
    errorMessage: string | null;
    winnerValue: number | null;
    pendingWinner?: number | null;
  }) => void;
};

/** Comandos operacionais do palco (política + executor); preferir isto às mutações directas na UI. */
export type { ComandoOperacionalResultado } from "./commands/commandPolicy.js";

type ValorContexto = {
  estado: RuntimeSessionState;
  seletores: RuntimeSessionSelectors;
  acoes: AcoesSessaoRuntime;
  comandos: ComandosRuntimeSafety;
  avisoOperacional: string | null;
  dispensarAvisoOperacional: () => void;
};

const RuntimeSessionContext = createContext<ValorContexto | null>(null);


function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function RuntimeSessionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<RuntimeSessionState>(estadoSessaoRuntimeInicial);
  const [avisoOperacional, setAvisoOperacional] = useState<string | null>(null);
  const estadoRef = useRef(estado);
  const avisoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sorteioAsyncLivreRef = useRef(true);

  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);

  const mostrarAvisoComando = useCallback((mensagemPt: string) => {
    if (avisoTimeoutRef.current) clearTimeout(avisoTimeoutRef.current);
    setAvisoOperacional(mensagemPt);
    avisoTimeoutRef.current = setTimeout(() => {
      setAvisoOperacional(null);
      avisoTimeoutRef.current = null;
    }, 4200);
  }, []);

  const dispensarAvisoOperacional = useCallback(() => {
    if (avisoTimeoutRef.current) clearTimeout(avisoTimeoutRef.current);
    avisoTimeoutRef.current = null;
    setAvisoOperacional(null);
  }, []);

  useEffect(
    () => () => {
      if (avisoTimeoutRef.current) clearTimeout(avisoTimeoutRef.current);
    },
    [],
  );

  const aplicar = useCallback((acao: RuntimeSessionDispatchAction) => {
    setEstado((prev) => {
      const next = transicionarSessaoRuntime(prev, acao);
      persistirSeNovoLogExecucao(prev, next);
      estadoRef.current = next;
      return next;
    });
  }, []);

  const aplicarEncadeado = useCallback((acoes: RuntimeSessionDispatchAction[]) => {
    setEstado((prev) => {
      let cur = prev;
      for (const acao of acoes) {
        const next = transicionarSessaoRuntime(cur, acao);
        persistirSeNovoLogExecucao(cur, next);
        cur = next;
      }
      estadoRef.current = cur;
      return cur;
    });
  }, []);

  const carregarPackValido = useCallback((packRoot: string, packData: PackLoaderSuccess) => {
    aplicar({ type: "CARREGAR_PACK_VALIDO", packRoot, packData });
  }, [aplicar]);

  const bloquearPack = useCallback(
    (mensagem: string) => {
      aplicar({ type: "BLOQUEAR_PACK", mensagem });
    },
    [aplicar],
  );

  const sessaoDescarregar = useCallback(() => {
    setEstado((prev) => {
      if (prev.appState.kind === "executing" && prev.appState.executionLog.length > 0) {
        const row = appendExecutionLog(prev.appState.executionLog, {
          level: "info",
          code: EXECUTION_LOG_CODES.EXECUTION_FINISHED,
          message: "Sessão descarregada (operador).",
        });
        persistirLinhaLog(prev.appState, row[row.length - 1]!);
      }
      const next = transicionarSessaoRuntime(prev, { type: "SESSAO_DESCARREGAR" });
      estadoRef.current = next;
      return next;
    });
  }, []);

  const atualizarWorkspace = useCallback(
    (workspaceRoot: string | null, bindings: Record<string, string>) => {
      setEstado((prev) => {
        if (!isActiveSession(prev.appState)) return prev;
        if (prev.appState.kind === "executing") {
          const row = appendExecutionLog(prev.appState.executionLog, {
            level: "info",
            code: EXECUTION_LOG_CODES.EXECUTION_FINISHED,
            message: "Workspace alterado durante execução — sessão reposta.",
          });
          persistirLinhaLog(prev.appState, row[row.length - 1]!);
        }
        const next = transicionarSessaoRuntime(prev, {
          type: "ATUALIZAR_WORKSPACE",
          workspaceRoot,
          bindings,
        });
        estadoRef.current = next;
        return next;
      });
    },
    [],
  );

  const atualizarBindings = useCallback((bindings: Record<string, string>) => {
    setEstado((prev) => {
      if (!isActiveSession(prev.appState)) return prev;
      if (prev.appState.kind === "executing") {
        const row = appendExecutionLog(prev.appState.executionLog, {
          level: "info",
          code: EXECUTION_LOG_CODES.EXECUTION_FINISHED,
          message: "Bindings alterados durante execução — sessão reposta.",
        });
        persistirLinhaLog(prev.appState, row[row.length - 1]!);
      }
      const next = transicionarSessaoRuntime(prev, { type: "ATUALIZAR_BINDINGS", bindings });
      estadoRef.current = next;
      return next;
    });
  }, []);

  const aplicarResultadoPreflight = useCallback(
    (resultado: PreflightResult) => {
      aplicar({ type: "APLICAR_RESULTADO_PREFLIGHT", resultado });
    },
    [aplicar],
  );

  const registroComandoBloqueado = useCallback(
    (nomeComando: string, res: Extract<ComandoOperacionalResultado, { ok: false }>) => {
      const s = estadoRef.current;
      if (s.appState.kind !== "executing") return;
      aplicar({
        type: "ANEXAR_LOG_EXECUCAO",
        entrada: {
          level: "warn",
          code: EXECUTION_LOG_CODES.COMMAND_BLOCKED,
          message: `command=${nomeComando}; codigo=${res.codigo}; ${res.mensagemPt}`,
        },
      });
    },
    [aplicar],
  );

  const onComandoNegado = useCallback(
    (nomeComando: string, res: Extract<ComandoOperacionalResultado, { ok: false }>) => {
      mostrarAvisoComando(res.mensagemPt);
      registroComandoBloqueado(nomeComando, res);
    },
    [mostrarAvisoComando, registroComandoBloqueado],
  );

  const runIniciarExecucaoInterno = useCallback((): ComandoOperacionalResultado => {
    setEstado((prev) => {
      if (prev.appState.kind !== "ready") return prev;
      const ordenadas = enabledScenesSorted(prev.appState.packData.event.scenes);
      const primeira = ordenadas[0];
      const drawResetKey = primeira ? chaveResetSorteioCena(primeira) : ":";
      const next = transicionarSessaoRuntime(prev, {
        type: "INICIAR_EXECUCAO",
        drawResetKey,
      });
      persistirSeNovoLogExecucao(prev, next);
      estadoRef.current = next;
      return next;
    });
    return { ok: true };
  }, []);

  const runConcluirExecucaoInterno = useCallback((): ComandoOperacionalResultado => {
    setEstado((prev) => {
      if (prev.appState.kind !== "executing") return prev;
      const row = appendExecutionLog(prev.appState.executionLog, {
        level: "info",
        code: EXECUTION_LOG_CODES.EXECUTION_FINISHED,
        message: "Execução concluída pelo operador (MVP).",
      });
      persistirLinhaLog(prev.appState, row[row.length - 1]!);
      const next = transicionarSessaoRuntime(prev, { type: "CONCLUIR_EXECUCAO" });
      estadoRef.current = next;
      return next;
    });
    return { ok: true };
  }, []);

  const runAtivarCenaPorIndiceInterno = useCallback((indice: number): ComandoOperacionalResultado => {
    setEstado((prev) => {
      if (prev.appState.kind !== "executing") return prev;
      const ordenadas = enabledScenesSorted(prev.appState.packData.event.scenes);
      const cena = ordenadas[indice];
      const drawResetKey = cena ? chaveResetSorteioCena(cena) : ":";
      const next = transicionarSessaoRuntime(prev, {
        type: "ATIVAR_CENA",
        indice,
        drawResetKey,
      });
      persistirSeNovoLogExecucao(prev, next);
      estadoRef.current = next;
      return next;
    });
    return { ok: true };
  }, []);

  const anexarLogExecucao = useCallback(
    (entrada: { level: ExecutionLogLevel; code: string; message: string }) => {
      aplicar({ type: "ANEXAR_LOG_EXECUCAO", entrada });
    },
    [aplicar],
  );

  const sincronizarSorteioEstatico = useCallback(
    (payload: {
      resetKey: string;
      panelState: DrawPanelState;
      errorMessage: string | null;
      winnerValue: number | null;
      pendingWinner?: number | null;
    }) => {
      aplicar({
        type: "SINCRONIZAR_SORTEIO_ESTATICO",
        resetKey: payload.resetKey,
        panelState: payload.panelState,
        errorMessage: payload.errorMessage,
        winnerValue: payload.winnerValue,
        pendingWinner: payload.pendingWinner ?? null,
      });
    },
    [aplicar],
  );

  const runIniciarSorteioInterno = useCallback(
    async (params: {
      scene: SceneContract;
      drawConfig: DrawConfigContract;
    }): Promise<ComandoOperacionalResultado> => {
      const { scene, drawConfig } = params;
      if (!sorteioAsyncLivreRef.current) {
        const dup: ComandoOperacionalResultado = {
          ok: false,
          codigo: "em_processamento",
          mensagemPt: "O sorteio já está a ser processado.",
        };
        onComandoNegado("iniciar_sorteio", dup);
        return dup;
      }

      const v = validateDrawSceneNumberRange(scene, drawConfig);
      if (!v.ok) {
        aplicarEncadeado([
          {
            type: "ANEXAR_LOG_EXECUCAO",
            entrada: {
              level: "warn",
              code: EXECUTION_LOG_CODES.DRAW_FAILED,
              message: `draw_config_id=${drawConfig.draw_config_id}; ${v.reason}`,
            },
          },
          { type: "SORTEIO_PARA_ERRO", errorMessage: v.reason },
        ]);
        return { ok: false, codigo: "validacao", mensagemPt: v.reason };
      }

      const { min, max } = effectiveNumberRange(drawConfig);
      const value = randomIntInclusive(min, max);
      sorteioAsyncLivreRef.current = false;
      try {
        aplicarEncadeado([
          {
            type: "ANEXAR_LOG_EXECUCAO",
            entrada: {
              level: "info",
              code: EXECUTION_LOG_CODES.DRAW_STARTED,
              message: `scene_id=${scene.scene_id}; draw_config_id=${drawConfig.draw_config_id}; draw_type=number_range; start_number=${v.startNumber}; end_number=${v.endNumber}`,
            },
          },
          { type: "SORTEIO_PARA_DESENHANDO", pendingWinner: value },
        ]);

        const rk = chaveResetSorteioCena(scene);
        const attemptAfter = estadoRef.current.operationalContext.drawAttemptId;
        const seed = spinScheduleSeed(rk, attemptAfter);
        const ticks = buildDrawSpinSchedule({ min, max, target: value, seed });
        const spinMs = spinScheduleTotalDuration(ticks);

        const ctx0 = estadoRef.current.operationalContext;
        const flightExec = ctx0.executionId;
        const flightScene = ctx0.sceneActivationId;
        const flightDraw = ctx0.drawAttemptId;

        await sleep(spinMs);

        const now = estadoRef.current;
        if (now.appState.kind !== "executing") return { ok: true };
        if (now.operationalContext.executionId !== flightExec) return { ok: true };
        if (now.operationalContext.sceneActivationId !== flightScene) return { ok: true };
        if (!drawAttemptCorresponde(now.operationalContext, flightDraw)) return { ok: true };
        if (now.drawRuntime.panelState !== "drawing") return { ok: true };

        aplicarEncadeado([
          {
            type: "ANEXAR_LOG_EXECUCAO",
            entrada: {
              level: "info",
              code: EXECUTION_LOG_CODES.DRAW_RESULT_GENERATED,
              message: `scene_id=${scene.scene_id}; draw_config_id=${drawConfig.draw_config_id}; winner=${value}`,
            },
          },
          { type: "SORTEIO_PARA_RESULTADO", winnerValue: value },
        ]);
        return { ok: true };
      } catch {
        const msg = "Falha inesperada durante o sorteio.";
        const now = estadoRef.current;
        if (now.appState.kind === "executing") {
          aplicarEncadeado([
            {
              type: "ANEXAR_LOG_EXECUCAO",
              entrada: {
                level: "error",
                code: EXECUTION_LOG_CODES.DRAW_FAILED,
                message: `scene_id=${scene.scene_id}; draw_config_id=${drawConfig.draw_config_id}; ${msg}`,
              },
            },
            { type: "SORTEIO_PARA_ERRO", errorMessage: msg },
          ]);
        }
        return { ok: false, codigo: "excecao", mensagemPt: msg };
      } finally {
        sorteioAsyncLivreRef.current = true;
      }
    },
    [aplicarEncadeado, onComandoNegado],
  );

  const runConfirmarResultadoSorteioInterno = useCallback(
    (params: { scene: SceneContract; drawConfig: DrawConfigContract }): ComandoOperacionalResultado => {
      const { scene, drawConfig } = params;
      const snap = estadoRef.current;
      const w = snap.drawRuntime.winnerValue;
      if (w == null) return { ok: false, codigo: "estado", mensagemPt: "Resultado já não está disponível para confirmar." };
      aplicarEncadeado([
        {
          type: "ANEXAR_LOG_EXECUCAO",
          entrada: {
            level: "info",
            code: EXECUTION_LOG_CODES.DRAW_RESULT_CONFIRMED,
            message: `scene_id=${scene.scene_id}; draw_config_id=${drawConfig.draw_config_id}; winner=${w}`,
          },
        },
        { type: "SORTEIO_PARA_CONFIRMADO" },
      ]);
      appendDrawHistoryEntry({
        resetKey: snap.drawRuntime.resetKey,
        drawName: drawConfig.name ?? "",
        value: w,
      });
      return { ok: true };
    },
    [aplicarEncadeado],
  );

  const runPrepararProximoSorteioInterno = useCallback((): ComandoOperacionalResultado => {
    aplicar({ type: "SORTEIO_PREPARAR_PRONTO" });
    return { ok: true };
  }, [aplicar]);

  const comandos = useMemo(
    () =>
      createRuntimeCommandExecutor({
        getEstado: () => estadoRef.current,
        onComandoNegado,
        runIniciarExecucao: runIniciarExecucaoInterno,
        runConcluirExecucao: runConcluirExecucaoInterno,
        runAtivarCenaPorIndice: runAtivarCenaPorIndiceInterno,
        runIniciarSorteio: runIniciarSorteioInterno,
        runConfirmarResultadoSorteio: runConfirmarResultadoSorteioInterno,
        runPrepararProximoSorteio: runPrepararProximoSorteioInterno,
      }),
    [
      onComandoNegado,
      runAtivarCenaPorIndiceInterno,
      runConfirmarResultadoSorteioInterno,
      runConcluirExecucaoInterno,
      runIniciarExecucaoInterno,
      runIniciarSorteioInterno,
      runPrepararProximoSorteioInterno,
    ],
  );

  const acoes = useMemo(
    (): AcoesSessaoRuntime => ({
      carregarPackValido,
      bloquearPack,
      sessaoDescarregar,
      atualizarWorkspace,
      atualizarBindings,
      aplicarResultadoPreflight,
      anexarLogExecucao,
      sincronizarSorteioEstatico,
    }),
    [
      anexarLogExecucao,
      aplicarResultadoPreflight,
      atualizarBindings,
      atualizarWorkspace,
      bloquearPack,
      carregarPackValido,
      sessaoDescarregar,
      sincronizarSorteioEstatico,
    ],
  );

  const seletores = useMemo(() => seletoresSessaoRuntime(estado), [estado]);

  const valor = useMemo(
    (): ValorContexto => ({
      estado,
      seletores,
      acoes,
      comandos,
      avisoOperacional,
      dispensarAvisoOperacional,
    }),
    [estado, seletores, acoes, comandos, avisoOperacional, dispensarAvisoOperacional],
  );

  return (
    <>
      {avisoOperacional ? (
        <div className="player-op-command-alert" role="alert">
          <p className="player-op-command-alert__text">{avisoOperacional}</p>
          <button type="button" className="player-op-command-alert__dismiss" onClick={dispensarAvisoOperacional}>
            Fechar
          </button>
        </div>
      ) : null}
      <RuntimeSessionContext.Provider value={valor}>{children}</RuntimeSessionContext.Provider>
    </>
  );
}

export function useRuntimeSession(): ValorContexto {
  const ctx = useContext(RuntimeSessionContext);
  if (!ctx) {
    throw new Error("useRuntimeSession: use dentro de RuntimeSessionProvider.");
  }
  return ctx;
}
