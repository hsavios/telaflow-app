/**
 * Tambor leve (Web Audio API) — sem arquivos externos; pode falhar silenciosamente
 * se o contexto estiver suspenso até haver gesto do utilizador.
 */

export class DrawSpinAudio {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof AudioContext === "undefined" && typeof (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext === "undefined") {
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

  /** Tenta retomar o contexto (necessário em alguns browsers antes de tocar). */
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
   * Um “tac” curto; `stepIndex` / `totalSteps` modulam tom e volume (efeito de desaceleração).
   */
  playTick(stepIndex: number, totalSteps: number): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const progress = totalSteps > 1 ? stepIndex / (totalSteps - 1) : 1;
    const freq = 95 + progress * 55 + (stepIndex % 3) * 4;
    const dur = 0.045 + progress * 0.035;

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    const gain = ctx.createGain();
    const peak = 0.07 / (1 + progress * 0.65);

    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(520 + progress * 380, t0);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  dispose(): void {
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
  }
}
