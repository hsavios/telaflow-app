/**
 * Constrói o conjunto de valores numéricos elegíveis e escolhe vencedor (exclusão local).
 */

import type { DrawAttendeesPackFile, DrawConfigContract } from "@telaflow/shared-contracts";

import { effectiveNumberRange, randomIntInclusive } from "./drawNumberRange.js";

function rangeInclusive(min: number, max: number): number[] {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const out: number[] = [];
  for (let n = lo; n <= hi; n++) out.push(n);
  return out;
}

/** Lista de números que podem sair no sorteio (antes de aplicar `excluded`). */
export function buildEligibleNumberPool(
  drawConfig: DrawConfigContract,
  attendees: DrawAttendeesPackFile | null,
): number[] {
  if (drawConfig.draw_type === "attendee_pool") {
    const rows =
      attendees?.entries_by_draw_config_id[drawConfig.draw_config_id] ?? [];
    const nums = rows
      .map((r) => r.assigned_number)
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
    return [...new Set(nums)].sort((a, b) => a - b);
  }
  const { min, max } = effectiveNumberRange(drawConfig);
  if (drawConfig.pool_mode === "subset" && drawConfig.eligible_numbers?.length) {
    return [...new Set(drawConfig.eligible_numbers)].sort((a, b) => a - b);
  }
  return rangeInclusive(min, max);
}

export function effectiveSpinBounds(
  drawConfig: DrawConfigContract,
  attendees: DrawAttendeesPackFile | null,
): { min: number; max: number } {
  const pool = buildEligibleNumberPool(drawConfig, attendees);
  if (pool.length === 0) return { min: 0, max: 0 };
  return { min: pool[0]!, max: pool[pool.length - 1]! };
}

export function pickDrawWinnerNumber(
  drawConfig: DrawConfigContract,
  attendees: DrawAttendeesPackFile | null,
  excluded: ReadonlySet<number>,
): { ok: true; value: number } | { ok: false; reason: string } {
  const pool = buildEligibleNumberPool(drawConfig, attendees).filter((n) => !excluded.has(n));
  if (pool.length === 0) {
    return { ok: false, reason: "Não há valores elegíveis (verifique intervalo, pool ou exclusões)." };
  }
  const idx = randomIntInclusive(0, pool.length - 1);
  return { ok: true, value: pool[idx]! };
}
