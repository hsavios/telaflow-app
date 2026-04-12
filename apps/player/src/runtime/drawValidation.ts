/**
 * Validação do sorteio antes de iniciar (intervalo, subset, pool de inscritos).
 */

import type { DrawAttendeesPackFile, DrawConfigContract, SceneContract } from "@telaflow/shared-contracts";

import { buildEligibleNumberPool, effectiveSpinBounds } from "./drawSelection.js";
import { effectiveNumberRange } from "./drawNumberRange.js";

export type ValidatedDrawRange =
  | { ok: true; startNumber: number; endNumber: number }
  | { ok: false; reason: string };

export function validateDrawSceneNumberRange(
  scene: SceneContract,
  drawConfig: DrawConfigContract,
  attendees: DrawAttendeesPackFile | null,
): ValidatedDrawRange {
  if (scene.type !== "draw") {
    return { ok: false, reason: "A cena não é do tipo draw." };
  }
  if (!drawConfig.enabled) {
    return { ok: false, reason: "Esta configuração de sorteio está desativada no pack." };
  }
  if (drawConfig.draw_type !== "number_range" && drawConfig.draw_type !== "attendee_pool") {
    return {
      ok: false,
      reason: `Tipo "${drawConfig.draw_type}" não é suportado nesta versão.`,
    };
  }
  if (drawConfig.draw_type === "attendee_pool") {
    const pool = buildEligibleNumberPool(drawConfig, attendees);
    if (pool.length === 0) {
      return {
        ok: false,
        reason:
          "Sorteio por inscritos sem números atribuídos neste pack. Exporte novamente com draw-attendees.json.",
      };
    }
    const { min, max } = effectiveSpinBounds(drawConfig, attendees);
    return { ok: true, startNumber: min, endNumber: max };
  }
  const base = effectiveNumberRange(drawConfig);
  if (!Number.isFinite(base.min) || !Number.isFinite(base.max)) {
    return { ok: false, reason: "Intervalo numérico inválido (min/max)." };
  }
  if (base.max < base.min) {
    return {
      ok: false,
      reason: "O número final do intervalo (end_number) deve ser maior ou igual ao inicial (start_number).",
    };
  }
  if (drawConfig.pool_mode === "subset") {
    const pool = buildEligibleNumberPool(drawConfig, attendees);
    if (pool.length === 0) {
      return { ok: false, reason: "pool_mode subset sem eligible_numbers válidos." };
    }
  }
  const { min, max } = effectiveSpinBounds(drawConfig, attendees);
  return { ok: true, startNumber: min, endNumber: max };
}
