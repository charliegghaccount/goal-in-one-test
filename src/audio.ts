export class Audio {
  context: AudioContext | null = null;
  enabled = true;
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch {
      /* Silent play remains available. */
    }
  }
  private tone(
    freq: number,
    duration: number,
    shape: OscillatorType = 'sine',
    volume = 0.08,
    delay = 0,
  ) {
    if (!this.enabled || !this.context) return;
    const ctx = this.context,
      t = ctx.currentTime + delay,
      osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = shape;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(50, freq * 0.6), t + duration);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }
  play(type: string) {
    if (type === 'shot') this.tone(600, 0.13, 'triangle', 0.09);
    if (type === 'post') this.tone(1100, 0.22, 'sine', 0.06);
    if (type === 'net') {
      this.tone(210, 0.25, 'triangle', 0.035);
      this.tone(380, 0.15, 'sine', 0.02, 0.07);
    }
    if (type === 'fail') this.tone(140, 0.3, 'triangle', 0.04);
    if (type === 'hit') this.tone(190, 0.065, 'sine', 0.025);
    if (type === 'bounce') {
      this.tone(340, 0.14, 'triangle');
      this.tone(680, 0.2, 'sine', 0.05, 0.06);
    }
    if (type === 'water')
      for (let i = 0; i < 5; i++) this.tone(150 + i * 65, 0.15, 'sine', 0.04, i * 0.04);
    if (type === 'win')
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        this.tone(f, 0.4, 'triangle', 0.07, i * 0.12),
      );
    if (type === 'ui') this.tone(740, 0.065, 'sine', 0.03);
  }
}
