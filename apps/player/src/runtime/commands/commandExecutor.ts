/**
 * Executor de comandos operacionais — a UI chama `comandos.*`; política + registo de bloqueio centralizados.
 */

import type { DrawConfigContract, SceneContract } from "@telaflow/shared-contracts";
import { enabledScenesSorted } from "../sceneOrder.js";
import { avaliarComando, type ComandoOperacionalResultado, type RuntimeCommand } from "./commandPolicy.js";

export type ComandoOperacionalNegado = Extract<ComandoOperacionalResultado, { ok: false }>;

export type OnComandoOperacionalNegado = (nomeComando: string, res: ComandoOperacionalNegado) => void;

export type ComandosRuntimeSafety = {
  iniciar_execucao: () => ComandoOperacionalResultado;
  concluir_execucao: () => ComandoOperacionalResultado;
  cena_seguinte: () => ComandoOperacionalResultado;
  cena_anterior: () => ComandoOperacionalResultado;
  ativar_cena_por_indice: (indice: number) => ComandoOperacionalResultado;
  iniciar_sorteio: (params: {
    scene: SceneContract;
    drawConfig: DrawConfigContract;
  }) => Promise<ComandoOperacionalResultado>;
  confirmar_resultado_sorteio: (params: {
    scene: SceneContract;
    drawConfig: DrawConfigContract;
  }) => ComandoOperacionalResultado;
  preparar_proximo_sorteio: () => ComandoOperacionalResultado;
};

export type RuntimeCommandExecutorDeps = {
  getEstado: () => import("../runtimeSessionTypes.js").RuntimeSessionState;
  onComandoNegado: OnComandoOperacionalNegado;
  runIniciarExecucao: () => ComandoOperacionalResultado;
  runConcluirExecucao: () => ComandoOperacionalResultado;
  runAtivarCenaPorIndice: (indice: number) => ComandoOperacionalResultado;
  runIniciarSorteio: (params: {
    scene: SceneContract;
    drawConfig: DrawConfigContract;
  }) => Promise<ComandoOperacionalResultado>;
  runConfirmarResultadoSorteio: (params: {
    scene: SceneContract;
    drawConfig: DrawConfigContract;
  }) => ComandoOperacionalResultado;
  runPrepararProximoSorteio: () => ComandoOperacionalResultado;
};

function negadoPolicy(
  getEstado: RuntimeCommandExecutorDeps["getEstado"],
  cmd: RuntimeCommand,
  nome: string,
  onComandoNegado: OnComandoOperacionalNegado,
): ComandoOperacionalResultado {
  const g = avaliarComando(getEstado(), cmd);
  if (!g.ok) onComandoNegado(nome, g);
  return g;
}

export function createRuntimeCommandExecutor(d: RuntimeCommandExecutorDeps): ComandosRuntimeSafety {
  return {
    iniciar_execucao: () => {
      const g = negadoPolicy(d.getEstado, { type: "iniciar_execucao" }, "iniciar_execucao", d.onComandoNegado);
      if (!g.ok) return g;
      return d.runIniciarExecucao();
    },
    concluir_execucao: () => {
      const g = negadoPolicy(d.getEstado, { type: "concluir_execucao" }, "concluir_execucao", d.onComandoNegado);
      if (!g.ok) return g;
      return d.runConcluirExecucao();
    },
    cena_seguinte: () => {
      const g = negadoPolicy(d.getEstado, { type: "cena_seguinte" }, "cena_seguinte", d.onComandoNegado);
      if (!g.ok) return g;
      const s = d.getEstado();
      if (s.appState.kind !== "executing") return g;
      const ordenadas = enabledScenesSorted(s.appState.packData.event.scenes);
      const n = ordenadas.length;
      const idx = Math.min(Math.max(0, s.appState.sceneIndex), Math.max(0, n - 1));
      return d.runAtivarCenaPorIndice(idx + 1);
    },
    cena_anterior: () => {
      const g = negadoPolicy(d.getEstado, { type: "cena_anterior" }, "cena_anterior", d.onComandoNegado);
      if (!g.ok) return g;
      const s = d.getEstado();
      if (s.appState.kind !== "executing") return g;
      const ordenadas = enabledScenesSorted(s.appState.packData.event.scenes);
      const n = ordenadas.length;
      const idx = Math.min(Math.max(0, s.appState.sceneIndex), Math.max(0, n - 1));
      return d.runAtivarCenaPorIndice(idx - 1);
    },
    ativar_cena_por_indice: (indice: number) => {
      const g = negadoPolicy(
        d.getEstado,
        { type: "ativar_cena_por_indice", indice },
        `ativar_cena_por_indice(${indice})`,
        d.onComandoNegado,
      );
      if (!g.ok) return g;
      return d.runAtivarCenaPorIndice(indice);
    },
    iniciar_sorteio: async (params) => {
      const g = negadoPolicy(d.getEstado, { type: "iniciar_sorteio" }, "iniciar_sorteio", d.onComandoNegado);
      if (!g.ok) return g;
      return d.runIniciarSorteio(params);
    },
    confirmar_resultado_sorteio: (params) => {
      const g = negadoPolicy(
        d.getEstado,
        { type: "confirmar_resultado_sorteio" },
        "confirmar_resultado_sorteio",
        d.onComandoNegado,
      );
      if (!g.ok) return g;
      return d.runConfirmarResultadoSorteio(params);
    },
    preparar_proximo_sorteio: () => {
      const g = negadoPolicy(
        d.getEstado,
        { type: "preparar_proximo_sorteio" },
        "preparar_proximo_sorteio",
        d.onComandoNegado,
      );
      if (!g.ok) return g;
      return d.runPrepararProximoSorteio();
    },
  };
}
