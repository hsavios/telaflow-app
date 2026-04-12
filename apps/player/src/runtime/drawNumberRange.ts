import type { DrawConfigContract } from "@telaflow/shared-contracts";

/** Intervalo efetivo quando `number_range` está ausente no pack (MVP operacional). */
export const DEFAULT_NUMBER_RANGE = { min: 1, max: 1000 } as const;

export function effectiveNumberRange(dc: DrawConfigContract): { min: number; max: number } {
  if (dc.number_range) {
    return { min: dc.number_range.min, max: dc.number_range.max };
  }
  return { ...DEFAULT_NUMBER_RANGE };
}

/** Inteiro pseudoaleatório em [min, max] inclusivo (Web Crypto). */
export function randomIntInclusive(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const span = hi - lo + 1;
  if (span <= 0) return lo;
  const maxUnbiased = Math.floor(0x1_0000_0000 / span) * span;
  const buf = new Uint32Array(1);
  let x = 0;
  do {
    crypto.getRandomValues(buf);
    x = buf[0]!;
  } while (x >= maxUnbiased);
  return lo + (x % span);
}
