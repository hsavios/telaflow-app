/**
 * Validação do sorteio `number_range` antes de iniciar (MVP Player).
 * No pack, o intervalo vem em `number_range.{min,max}` (contrato); na UI tratamos como início/fim do intervalo.
 */

import type { DrawConfigContract, SceneContract } from "@telaflow/shared-contracts";
import { effectiveNumberRange } from "./drawNumberRange.js";

export type ValidatedDrawRange =
  | { ok: true; startNumber: number; endNumber: number }
  | { ok: false; reason: string };

export function validateDrawSceneNumberRange(
  scene: SceneContract,
  drawConfig: DrawConfigContract,
): ValidatedDrawRange {
  if (scene.type !== "draw") {
    return { ok: false, reason: "A cena não é do tipo draw." };
  }
  if (!drawConfig.enabled) {
    return { ok: false, reason: "Esta configuração de sorteio está desativada no pack." };
  }
  if (drawConfig.draw_type !== "number_range") {
    return {
      ok: false,
      reason: `Tipo "${drawConfig.draw_type}" não é suportado no MVP (apenas number_range).`,
    };
  }
  const { min, max } = effectiveNumberRange(drawConfig);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { ok: false, reason: "Intervalo numérico inválido (min/max)." };
  }
  if (max < min) {
    return {
      ok: false,
      reason: "O número final do intervalo (end_number) deve ser maior ou igual ao inicial (start_number).",
    };
  }
  return { ok: true, startNumber: min, endNumber: max };
}
