/**
 * Estados do Player (MVP) — loader, licença, binding, pre-flight e FSM operacional.
 * Playback de mídia e lógica completa de cena ficam fora de escopo.
 */

import type { OperationalPhase } from "../runtime/operationalState.js";
import type { PreflightResult } from "../preflight/types.js";
import type { PackLoaderSuccess } from "./validateLoadedPack.js";

export type { OperationalPhase } from "../runtime/operationalState.js";

export type PlayerAppState =
  | { kind: "idle" }
  | { kind: "blocked"; message: string }
  | {
      kind: "pack_loaded";
      packRoot: string;
      packData: PackLoaderSuccess;
      /** Pasta de workspace local (mídia, bindings). */
      workspaceRoot: string | null;
      /** media_id → caminho relativo ao workspaceRoot. */
      bindings: Record<string, string>;
      lastPreflight: PreflightResult | null;
      /** FSM após pack válido (ver ARCHITECTURE_SPEC §14). */
      operationalPhase: OperationalPhase;
      /** Índice na sequência ordenada de cenas (usado quando `executing`). */
      sceneIndex: number;
    };
