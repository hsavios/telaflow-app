/**
 * Leitura do runtime de sorteio a partir do `RuntimeSessionStore` (fonte única de verdade).
 * As transições operacionais usam `useRuntimeSession().comandos` (ex.: `iniciar_sorteio`).
 */

import { useRuntimeSession } from "./RuntimeSessionContext.js";
import type { DrawPanelState } from "./runtimeSessionTypes.js";

export type { DrawPanelState } from "./runtimeSessionTypes.js";

export type DrawRuntimeLeitura = {
  resetKey: string;
  panelState: DrawPanelState;
  winnerValue: number | null;
  errorMessage: string | null;
};

export function useDrawRuntime(): DrawRuntimeLeitura {
  const { estado } = useRuntimeSession();
  const d = estado.drawRuntime;
  return {
    resetKey: d.resetKey,
    panelState: d.panelState,
    winnerValue: d.winnerValue,
    errorMessage: d.errorMessage,
  };
}
