/**
 * FSM operacional mínima (MVP) — alinhada em espírito a ARCHITECTURE_SPEC / PLAYER_RUNTIME_FEATURE_SPEC.
 * Não inclui playback nem execução real de conteúdo.
 */

import type { PreflightResult } from "../preflight/types.js";

/** Fases operacionais após pack + licença válidos. */
export type OperationalPhase =
  | "binding_pending"
  | "preflight_failed"
  | "ready"
  | "executing";

/** Após pre-flight: `ready` só se zero bloqueantes (gate). */
export function phaseAfterPreflight(result: PreflightResult): OperationalPhase {
  return result.blockingCount === 0 ? "ready" : "preflight_failed";
}

export function describeOperationalPhasePt(phase: OperationalPhase): string {
  const m: Record<OperationalPhase, string> = {
    binding_pending: "aguardando vínculos / nova validação",
    preflight_failed: "pre-flight com bloqueantes",
    ready: "pronto (gate OK)",
    executing: "a executar roteiro (MVP sem playback)",
  };
  return m[phase];
}
