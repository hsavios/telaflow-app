/**
 * Textos e rótulos operacionais do runtime de cenas (pt-BR, sem jargão técnico no painel).
 */

import type { DrawConfigContract, SceneContract, SceneType } from "@telaflow/shared-contracts";
import { EXECUTION_LOG_CODES, type ExecutionLogEntry } from "../execution/executionLog.js";
import type { SceneMediaDerivedState } from "./sceneMediaResolution.js";

export const SCENE_TYPE_LABELS_PT: Record<SceneType, string> = {
  opening: "Abertura",
  institutional: "Institucional",
  sponsor: "Patrocinador",
  draw: "Sorteio",
  break: "Intervalo",
  closing: "Encerramento",
};

export type MidiaPainelRoteiro = "pronta" | "pendente" | "ausente" | "sem_midia";

export function midiaPainelRoteiro(estado: SceneMediaDerivedState): MidiaPainelRoteiro {
  switch (estado) {
    case "media_bound":
    case "no_media_required":
      return estado === "no_media_required" ? "sem_midia" : "pronta";
    case "media_missing_binding":
      return "pendente";
    case "media_file_missing":
      return "ausente";
  }
}

export function midiaPainelRoteiroLegenda(b: MidiaPainelRoteiro): string {
  const m: Record<MidiaPainelRoteiro, string> = {
    pronta: "Pronta",
    pendente: "Pendente",
    ausente: "Ausente",
    sem_midia: "Sem mídia",
  };
  return m[b];
}

export type SorteioPainelRoteiro = "ok" | "sem_id" | "config_ausente" | "nao_suportado";

export function sorteioPainelRoteiro(
  scene: SceneContract,
  drawConfig: DrawConfigContract | null,
): SorteioPainelRoteiro {
  if (scene.type !== "draw") return "ok";
  const id = scene.draw_config_id?.trim();
  if (!id) return "sem_id";
  if (!drawConfig) return "config_ausente";
  if (drawConfig.draw_type !== "number_range") return "nao_suportado";
  return "ok";
}

export function sorteioPainelRoteiroLegenda(s: SorteioPainelRoteiro): string | null {
  if (s === "ok") return null;
  const m: Record<Exclude<SorteioPainelRoteiro, "ok">, string> = {
    sem_id: "Sorteio sem configuração",
    config_ausente: "Config. ausente no pack",
    nao_suportado: "Tipo de sorteio não suportado",
  };
  return m[s];
}

export function resumoLogOperacionalPt(entry: ExecutionLogEntry): string {
  switch (entry.code) {
    case EXECUTION_LOG_CODES.EXECUTION_STARTED:
      return "Evento posto no ar.";
    case EXECUTION_LOG_CODES.SCENE_ACTIVATED:
      return "Palco mudou de cena.";
    case EXECUTION_LOG_CODES.EXECUTION_FINISHED:
      return "Roteiro encerrado.";
    case EXECUTION_LOG_CODES.MEDIA_STARTED:
      return "Mídia a reproduzir no palco.";
    case EXECUTION_LOG_CODES.MEDIA_FAILED:
      return "Mídia não reproduziu.";
    case EXECUTION_LOG_CODES.DRAW_STARTED:
      return "Sorteio iniciado.";
    case EXECUTION_LOG_CODES.DRAW_RESULT_GENERATED:
      return "Número do sorteio revelado.";
    case EXECUTION_LOG_CODES.DRAW_RESULT_CONFIRMED:
      return "Resultado do sorteio confirmado.";
    case EXECUTION_LOG_CODES.DRAW_FAILED:
      return "Sorteio interrompido ou inválido.";
    case EXECUTION_LOG_CODES.COMMAND_BLOCKED:
      return "Ação não permitida neste momento.";
    default:
      return entry.message.length > 72 ? `${entry.message.slice(0, 69)}…` : entry.message;
  }
}

export function formatarHoraLogPt(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}
