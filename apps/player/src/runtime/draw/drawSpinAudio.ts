/**
 * Tambor sintético (Web Audio API) — envelope progressivo (ataque + decay);
 * silêncio nos últimos passos antes do número final; toque curto de resolução no último tick.
 */

/** Sem áudio nestes últimos passos (pausa dramática antes do resultado). */
const SILENT_LAST_STEPS = 3;

export class DrawSpinAudio {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (
      typeof AudioContext === "undefined" &&
      typeof (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ===
        "undefined"
    ) {
      return null;
    }
    const Ctx =
      typeof AudioContext !== "undefined"
        ? AudioContext
        : (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!this.ctx) {
      try {
        this.ctx = new Ctx();
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  async prime(): Promise<void> {
    const c = this.getContext();
    if (c?.state === "suspended") {
      try {
        await c.resume();
      } catch {
        /* ignorar */
      }
    }
  }

  /**
   * Tac curto com envelope tipo sino no volume e no filtro (progresso do sorteio).
   * Últimos `SILENT_LAST_STEPS` passos: silêncio.
   */
  playTick(stepIndex: number, totalSteps: number): void {
    if (totalSteps > SILENT_LAST_STEPS && stepIndex >= totalSteps - SILENT_LAST_STEPS) {
      return;
    }
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const progress = totalSteps > 1 ? stepIndex / (totalSteps - 1) : 1;
    const envelopeShape = Math.sin(progress * Math.PI);
    const freqBase = 72 + progress * 58 + (stepIndex % 4) * 2.5;
    const attack = 0.006;
    const decay = 0.028 + envelopeShape * 0.038;
    const dur = attack + decay;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    const gain = ctx.createGain();
    const peak = (0.028 + envelopeShape * 0.042) / (1 + progress * 0.55);

    osc.frequency.setValueAtTime(freqBase, t0);
    osc.frequency.linearRampToValueAtTime(freqBase * (1 - envelopeShape * 0.028), t0 + dur);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(Math.max(peak, 0.0002), t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.setValueAtTime(0.7, t0);
    filter.frequency.setValueAtTime(280 + envelopeShape * 480, t0);
    filter.frequency.linearRampToValueAtTime(240 + envelopeShape * 220, t0 + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t0 + dur + 0.012);
  }

  /**
   * Toque curto de resolução (quinta justa suave) no momento em que o número final aparece na animação.
   */
  playResultChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const freqs = [392.0, 523.25] as const;
    const step = 0.052;
    const vol = 0.065;

    freqs.forEach((f, i) => {
      const t = t0 + i * step;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }

  dispose(): void {
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
  }
}
