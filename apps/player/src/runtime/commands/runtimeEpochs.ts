/**
 * Épocas do runtime — identificadores monótonos para invalidar efeitos assíncronos obsoletos.
 * Fonte canónica dos campos: `RuntimeSessionState.operationalContext` em `runtimeSessionTypes`.
 */

import type { OperationalContextIds } from "../runtimeSessionTypes.js";
import { contextoOperacionalInicial } from "../runtimeSessionTypes.js";

/** Alias semântico: executionId, sceneActivationId, drawAttemptId, mediaPlaybackId. */
export type RuntimeEpochs = OperationalContextIds;

export { contextoOperacionalInicial as runtimeEpochsInicial };

export function drawAttemptCorresponde(epochs: RuntimeEpochs, drawAttemptIdCapturado: number): boolean {
  return epochs.drawAttemptId === drawAttemptIdCapturado;
}
