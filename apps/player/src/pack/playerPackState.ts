/**
 * FSM do Player (MVP) — estados de topo conforme ARCHITECTURE_SPEC / PLAYER_RUNTIME_FEATURE_SPEC.
 * idle → pack_loaded → (pre-flight) → preflight_failed | ready → executing → …
 */

import type { ExecutionLogEntry } from "../execution/executionLog.js";
import type { PreflightResult } from "../preflight/types.js";
import type { PackLoaderSuccess } from "./validateLoadedPack.js";

/** Campos compartilhados enquanto há sessão com pack válido em memória. */
export type PlayerSessionCore = {
  packRoot: string;
  packData: PackLoaderSuccess;
  workspaceRoot: string | null;
  bindings: Record<string, string>;
  sceneIndex: number;
  /**
   * Registro de execução: preenchido apenas em `executing` (inicia ao entrar neste estado).
   */
  executionLog: ExecutionLogEntry[];
};

export type PlayerActiveSession =
  | ({ kind: "pack_loaded" } & PlayerSessionCore & { lastPreflight: PreflightResult | null })
  | ({ kind: "preflight_failed" } & PlayerSessionCore & { lastPreflight: PreflightResult })
  | ({ kind: "ready" } & PlayerSessionCore & { lastPreflight: PreflightResult })
  | ({ kind: "executing" } & PlayerSessionCore & { lastPreflight: PreflightResult });

export type PlayerAppState =
  | { kind: "idle" }
  | { kind: "blocked"; message: string }
  | PlayerActiveSession;

export function isActiveSession(s: PlayerAppState): s is PlayerActiveSession {
  return (
    s.kind === "pack_loaded" ||
    s.kind === "preflight_failed" ||
    s.kind === "ready" ||
    s.kind === "executing"
  );
}

/** Volta a `pack_loaded` após alteração de workspace/bindings (exige novo pre-flight). */
export function resetSessionToPackLoaded(s: PlayerActiveSession): PlayerAppState {
  return {
    kind: "pack_loaded",
    packRoot: s.packRoot,
    packData: s.packData,
    workspaceRoot: s.workspaceRoot,
    bindings: s.bindings,
    lastPreflight: null,
    sceneIndex: 0,
    executionLog: [],
  };
}
