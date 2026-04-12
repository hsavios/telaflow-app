/**
 * Motor puro do sorteio visual (Draw Experience v1): agenda de valores e intervalos
 * determinísticos a partir do alvo e da semente — sem DOM nem áudio.
 */

export const DRAW_SPIN_TICK_COUNT = 34;
export const DRAW_SPIN_TOTAL_MS = 3200;

export type DrawSpinTick = {
  value: number;
  delayAfterMs: number;
};

/** PRNG determinístico (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semente estável para o mesmo resetKey + tentativa de sorteio. */
export function spinScheduleSeed(resetKey: string, drawAttemptId: number): number {
  let h = drawAttemptId >>> 0;
  for (let i = 0; i < resetKey.length; i++) {
    h = (Math.imul(31, h) + resetKey.charCodeAt(i)!) >>> 0;
  }
  return h === 0 ? 1 : h;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function randomInRange(rng: () => number, lo: number, hi: number): number {
  if (hi <= lo) return lo;
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/**
 * Gera ticks com desaceleração progressiva (intervalos crescem) até parar no alvo.
 */
export function buildDrawSpinSchedule(input: {
  min: number;
  max: number;
  target: number;
  seed: number;
  tickCount?: number;
  totalDurationMs?: number;
}): DrawSpinTick[] {
  const lo = Math.min(input.min, input.max);
  const hi = Math.max(input.min, input.max);
  const n = input.tickCount ?? DRAW_SPIN_TICK_COUNT;
  const total = input.totalDurationMs ?? DRAW_SPIN_TOTAL_MS;
  const target = clamp(Math.round(input.target), lo, hi);
  const rng = mulberry32(input.seed);

  const weights = Array.from({ length: n }, (_, i) => (i + 1) ** 1.82);
  const wsum = weights.reduce((a, b) => a + b, 0);
  const delays = weights.map((w) => (w / wsum) * total);

  const ticks: DrawSpinTick[] = [];
  const convergeFrom = Math.max(0, n - 9);

  for (let i = 0; i < n - 1; i++) {
    let v: number;
    if (i < convergeFrom) {
      v = randomInRange(rng, lo, hi);
    } else if (i === n - 2) {
      if (hi <= lo) {
        v = lo;
      } else {
        let guard = 0;
        do {
          v = randomInRange(rng, lo, hi);
          guard++;
        } while (v === target && guard < 64);
      }
    } else {
      const t = (i - convergeFrom) / Math.max(1, n - 2 - convergeFrom);
      const mix = 1 - (1 - t) ** 2.35;
      const r = randomInRange(rng, lo, hi);
      v = clamp(Math.round(r * (1 - mix) + target * mix), lo, hi);
    }
    ticks.push({ value: v, delayAfterMs: delays[i]! });
  }

  ticks.push({ value: target, delayAfterMs: delays[n - 1]! });
  return ticks;
}

export function spinScheduleTotalDuration(ticks: DrawSpinTick[]): number {
  return ticks.reduce((s, t) => s + t.delayAfterMs, 0);
}
