/**
 * Motor puro do sorteio (Draw Experience Premium v1): fase rápida, desaceleração,
 * freeze antes do número final — determinístico; sem DOM nem áudio.
 */

/** Duração total da animação (inclui freeze antes do último tick = alvo). */
export const DRAW_SPIN_PREMIUM_TOTAL_MS = 4800;
/** Pausa curta no penúltimo valor antes de revelar o alvo (ainda em «drawing»). */
export const DRAW_SPIN_PREMIUM_FREEZE_MS = 620;

export const DRAW_SPIN_TICK_COUNT = 40;

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
 * Pesos premium: fase inicial compacta (números rápidos), desaceleração progressiva no tramo final.
 */
function premiumDelayWeights(n: number): number[] {
  const fastCut = Math.floor(n * 0.4);
  return Array.from({ length: n }, (_, i) => {
    const p = i / Math.max(1, n - 1);
    if (i < fastCut) {
      return 0.42 + i * 0.045;
    }
    const u = (p - 0.4) / 0.6;
    return 0.28 + Math.pow(Math.max(0, u) + 0.1, 2.5) * 24;
  });
}

/**
 * Gera ticks com fase rápida, desaceleração progressiva e freeze antes do valor final.
 */
export function buildDrawSpinSchedule(input: {
  min: number;
  max: number;
  target: number;
  seed: number;
  tickCount?: number;
  totalDurationMs?: number;
  freezeBeforeFinalMs?: number;
}): DrawSpinTick[] {
  const lo = Math.min(input.min, input.max);
  const hi = Math.max(input.min, input.max);
  const n = input.tickCount ?? DRAW_SPIN_TICK_COUNT;
  const total = input.totalDurationMs ?? DRAW_SPIN_PREMIUM_TOTAL_MS;
  const freeze = input.freezeBeforeFinalMs ?? DRAW_SPIN_PREMIUM_FREEZE_MS;
  const budget = Math.max(200, total - freeze);
  const target = clamp(Math.round(input.target), lo, hi);
  const rng = mulberry32(input.seed);

  const weights = premiumDelayWeights(n);
  const wsum = weights.reduce((a, b) => a + b, 0);
  const delays = weights.map((w) => (w / wsum) * budget);

  const ticks: DrawSpinTick[] = [];
  const convergeFrom = Math.max(0, n - 10);

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

  if (ticks.length >= 2) {
    const pen = ticks[ticks.length - 2]!;
    ticks[ticks.length - 2] = {
      value: pen.value,
      delayAfterMs: pen.delayAfterMs + freeze,
    };
  }

  return ticks;
}

export function spinScheduleTotalDuration(ticks: DrawSpinTick[]): number {
  return ticks.reduce((s, t) => s + t.delayAfterMs, 0);
}
