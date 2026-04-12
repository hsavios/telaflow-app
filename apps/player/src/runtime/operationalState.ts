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
    pack_loaded: "Pack aberto — ligue a mídia ao workspace e corra as checagens",
    preflight_failed: "Checagens com bloqueantes — corrija antes do vivo",
    ready: "Pronto para ir ao vivo",
    executing: "Roteiro em execução (palco, telão e sorteio)",
  };
  return m[kind];
}
