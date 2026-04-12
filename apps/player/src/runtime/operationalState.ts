/**
 * FSM operacional do Player (MVP) — alinhada a ARCHITECTURE_SPEC / PLAYER_RUNTIME_FEATURE_SPEC.
 * Estados de topo: idle, pack_loaded, preflight_failed, ready, executing, blocked.
 */

import type { PreflightResult } from "../preflight/types.js";

/** Estados após pack + licença válidos (nível de topo em `PlayerAppState.kind`). */
export type PlayerOperationalKind =
  | "pack_loaded"
  | "preflight_failed"
  | "ready"
  | "executing";

/** Resultado do pre-flight: sem bloqueantes → `ready`, caso contrário `preflight_failed`. */
export function kindAfterPreflight(result: PreflightResult): "ready" | "preflight_failed" {
  return result.blockingCount === 0 ? "ready" : "preflight_failed";
}

export function describeOperationalKindPt(kind: PlayerOperationalKind): string {
  const m: Record<PlayerOperationalKind, string> = {
    pack_loaded: "Pack aberto — vincule a mídia e execute as checagens antes de iniciar",
    preflight_failed: "Ajustes pendentes — resolva os itens bloqueantes antes do ao vivo",
    ready: "Pronto para iniciar o evento",
    executing: "Evento ao vivo — palco, telão e sorteio",
  };
  return m[kind];
}
