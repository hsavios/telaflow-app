/**
 * Política de comandos operacionais (MVP) — só leitura de `RuntimeSessionState`, pt-BR.
 */

import { enabledScenesSorted } from "../sceneOrder.js";
import type { RuntimeSessionState } from "../runtimeSessionTypes.js";

export type ComandoOperacionalResultado =
  | { ok: true }
  | { ok: false; codigo: string; mensagemPt: string };

/** Mensagem única quando navegação (ou operações equivalentes) está bloqueada durante o sorteio. */
export const MENSAGEM_AGUARDE_SORTEIO_ATUAL = "Aguarde a conclusão do sorteio atual.";

export type SeletoresComandosUi = {
  iniciarExecucao: { permitido: boolean; motivo?: string };
  concluirExecucao: { permitido: boolean; motivo?: string };
  cenaAnterior: { permitido: boolean; motivo?: string };
  cenaSeguinte: { permitido: boolean; motivo?: string };
  iniciarSorteio: { permitido: boolean; motivo?: string };
  confirmarSorteio: { permitido: boolean; motivo?: string };
  prepararProximoSorteio: { permitido: boolean; motivo?: string };
};

/** Comandos explícitos do palco (snake_case). */
export type RuntimeCommand =
  | { type: "iniciar_execucao" }
  | { type: "concluir_execucao" }
  | { type: "cena_seguinte" }
  | { type: "cena_anterior" }
  | { type: "iniciar_sorteio" }
  | { type: "confirmar_resultado_sorteio" }
  | { type: "preparar_proximo_sorteio" }
  | { type: "ativar_cena_por_indice"; indice: number };

function negado(codigo: string, mensagemPt: string): ComandoOperacionalResultado {
  return { ok: false, codigo, mensagemPt };
}

export function podeIniciarExecucao(estado: RuntimeSessionState): ComandoOperacionalResultado {
  if (estado.appState.kind !== "ready") {
    return negado("fsm", "Só é possível iniciar o roteiro quando o estado for «pronto» (pre-flight sem bloqueantes).");
  }
  return { ok: true };
}

export function podeConcluirExecucao(estado: RuntimeSessionState): ComandoOperacionalResultado {
  if (estado.appState.kind !== "executing") {
    return negado("fsm", "Não há execução ativa para concluir.");
  }
  if (estado.drawRuntime.panelState === "drawing") {
    return negado("sorteio_em_curso", MENSAGEM_AGUARDE_SORTEIO_ATUAL);
  }
  return { ok: true };
}

export function podeAtivarCenaPorIndice(
  estado: RuntimeSessionState,
  indice: number,
): ComandoOperacionalResultado {
  if (estado.appState.kind !== "executing") {
    return negado("fsm", "Só é possível mudar de cena durante a execução do roteiro.");
  }
  if (estado.drawRuntime.panelState === "drawing") {
    return negado("sorteio_em_curso", MENSAGEM_AGUARDE_SORTEIO_ATUAL);
  }
  const ordenadas = enabledScenesSorted(estado.appState.packData.event.scenes);
  const n = ordenadas.length;
  if (n === 0) {
    return negado("roteiro", "Não há cenas ativas no roteiro.");
  }
  if (indice < 0 || indice >= n) {
    return negado("indice", "Índice de cena inválido.");
  }
  if (indice === estado.appState.sceneIndex) {
    return negado("mesma_cena", "Esta cena já está ativa.");
  }
  return { ok: true };
}

export function podeIniciarSorteio(estado: RuntimeSessionState): ComandoOperacionalResultado {
  if (estado.appState.kind !== "executing") {
    return negado("fsm", "O sorteio só está disponível durante a execução do roteiro.");
  }
  if (estado.drawRuntime.panelState === "drawing") {
    return negado("sorteio_em_curso", "O sorteio já está em curso.");
  }
  if (estado.drawRuntime.panelState !== "ready") {
    return negado(
      "painel_sorteio",
      "O sorteio não está pronto para iniciar (valide a cena ou aguarde a sincronização).",
    );
  }
  return { ok: true };
}

export function podeConfirmarResultadoSorteio(estado: RuntimeSessionState): ComandoOperacionalResultado {
  if (estado.appState.kind !== "executing") {
    return negado("fsm", "Não há execução ativa.");
  }
  if (estado.drawRuntime.panelState !== "result_generated" || estado.drawRuntime.winnerValue == null) {
    return negado("sorteio", "Só é possível confirmar após gerar um resultado de sorteio.");
  }
  return { ok: true };
}

export function podePrepararProximoSorteio(estado: RuntimeSessionState): ComandoOperacionalResultado {
  if (estado.appState.kind !== "executing") {
    return negado("fsm", "Não há execução ativa.");
  }
  if (estado.drawRuntime.panelState !== "result_confirmed") {
    return negado(
      "sorteio",
      "Só é possível preparar outro sorteio após confirmar o resultado atual.",
    );
  }
  return { ok: true };
}

/**
 * Avalia um comando explícito no estado atual (`permitido` + motivo pt-BR quando negado).
 */
export function avaliarComando(estado: RuntimeSessionState, cmd: RuntimeCommand): ComandoOperacionalResultado {
  switch (cmd.type) {
    case "iniciar_execucao":
      return podeIniciarExecucao(estado);
    case "concluir_execucao":
      return podeConcluirExecucao(estado);
    case "cena_seguinte":
    case "cena_anterior": {
      if (estado.appState.kind !== "executing") {
        return negado("fsm", "Só é possível mudar de cena durante a execução do roteiro.");
      }
      const ordenadas = enabledScenesSorted(estado.appState.packData.event.scenes);
      const n = ordenadas.length;
      if (n === 0) return negado("roteiro", "Não há cenas ativas no roteiro.");
      const idx = Math.min(Math.max(0, estado.appState.sceneIndex), n - 1);
      const alvo = cmd.type === "cena_anterior" ? idx - 1 : idx + 1;
      if (cmd.type === "cena_anterior" && idx <= 0) {
        return negado("limite", "Já está na primeira cena.");
      }
      if (cmd.type === "cena_seguinte" && idx >= n - 1) {
        return negado("limite", "Já está na última cena.");
      }
      return podeAtivarCenaPorIndice(estado, alvo);
    }
    case "ativar_cena_por_indice":
      return podeAtivarCenaPorIndice(estado, cmd.indice);
    case "iniciar_sorteio":
      return podeIniciarSorteio(estado);
    case "confirmar_resultado_sorteio":
      return podeConfirmarResultadoSorteio(estado);
    case "preparar_proximo_sorteio":
      return podePrepararProximoSorteio(estado);
  }
}

export function seletoresComandosUi(estado: RuntimeSessionState): SeletoresComandosUi {
  const iniciarExec = podeIniciarExecucao(estado);
  const concluir = podeConcluirExecucao(estado);
  const iniSort = podeIniciarSorteio(estado);
  const confSort = podeConfirmarResultadoSorteio(estado);
  const proxSort = podePrepararProximoSorteio(estado);

  let cenaAnt = { permitido: false, motivo: undefined as string | undefined };
  let cenaSeg = { permitido: false, motivo: undefined as string | undefined };

  if (estado.appState.kind === "executing") {
    const ordenadas = enabledScenesSorted(estado.appState.packData.event.scenes);
    const n = ordenadas.length;
    if (n === 0) {
      return {
        iniciarExecucao: {
          permitido: iniciarExec.ok,
          motivo: iniciarExec.ok ? undefined : iniciarExec.mensagemPt,
        },
        concluirExecucao: {
          permitido: concluir.ok,
          motivo: concluir.ok ? undefined : concluir.mensagemPt,
        },
        cenaAnterior: { permitido: false, motivo: "Sem cenas ativas no roteiro." },
        cenaSeguinte: { permitido: false, motivo: "Sem cenas ativas no roteiro." },
        iniciarSorteio: {
          permitido: iniSort.ok,
          motivo: iniSort.ok ? undefined : iniSort.mensagemPt,
        },
        confirmarSorteio: {
          permitido: confSort.ok,
          motivo: confSort.ok ? undefined : confSort.mensagemPt,
        },
        prepararProximoSorteio: {
          permitido: proxSort.ok,
          motivo: proxSort.ok ? undefined : proxSort.mensagemPt,
        },
      };
    }
    const idx = Math.min(Math.max(0, estado.appState.sceneIndex), n - 1);
    const rAnt = podeAtivarCenaPorIndice(estado, idx - 1);
    const rSeg = podeAtivarCenaPorIndice(estado, idx + 1);
    cenaAnt = {
      permitido: idx > 0 && rAnt.ok,
      motivo:
        idx <= 0
          ? "Já está na primeira cena."
          : estado.drawRuntime.panelState === "drawing"
            ? MENSAGEM_AGUARDE_SORTEIO_ATUAL
            : rAnt.ok
              ? undefined
              : rAnt.mensagemPt,
    };
    cenaSeg = {
      permitido: n > 0 && idx < n - 1 && rSeg.ok,
      motivo:
        n === 0 || idx >= n - 1
          ? "Já está na última cena."
          : estado.drawRuntime.panelState === "drawing"
            ? MENSAGEM_AGUARDE_SORTEIO_ATUAL
            : rSeg.ok
              ? undefined
              : rSeg.mensagemPt,
    };
  } else {
    cenaAnt = { permitido: false, motivo: "Só durante a execução do roteiro." };
    cenaSeg = { permitido: false, motivo: "Só durante a execução do roteiro." };
  }

  return {
    iniciarExecucao: {
      permitido: iniciarExec.ok,
      motivo: iniciarExec.ok ? undefined : iniciarExec.mensagemPt,
    },
    concluirExecucao: {
      permitido: concluir.ok,
      motivo: concluir.ok ? undefined : concluir.mensagemPt,
    },
    cenaAnterior: cenaAnt,
    cenaSeguinte: cenaSeg,
    iniciarSorteio: {
      permitido: iniSort.ok,
      motivo: iniSort.ok ? undefined : iniSort.mensagemPt,
    },
    confirmarSorteio: {
      permitido: confSort.ok,
      motivo: confSort.ok ? undefined : confSort.mensagemPt,
    },
    prepararProximoSorteio: {
      permitido: proxSort.ok,
      motivo: proxSort.ok ? undefined : proxSort.mensagemPt,
    },
  };
}
