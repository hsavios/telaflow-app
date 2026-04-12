/**
 * Reexporta tipos e constantes do bridge da janela pública (compatibilidade de imports).
 * Fonte de verdade: `publicWindowBridge.ts`.
 */

import {
  derivarSnapshotJanelaPublica,
  emitirSnapshotJanelaPublica,
  PUBLIC_WINDOW_STATE_EVENT,
  type PublicWindowAppStateSnapshot,
  type PublicWindowDrawSnapshot,
  type PublicWindowOperatorSnapshot,
} from "./publicWindowBridge.js";

export {
  PUBLIC_WINDOW_STATE_EVENT,
  derivarSnapshotJanelaPublica,
  emitirSnapshotJanelaPublica,
  type PublicWindowAppStateSnapshot,
  type PublicWindowDrawSnapshot,
  type PublicWindowOperatorSnapshot,
};

/** Alias legado — preferir `PublicWindowOperatorSnapshot`. */
export type PublicWindowStatePayload = PublicWindowOperatorSnapshot;
