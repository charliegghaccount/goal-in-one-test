import {
  CompletionCelebration,
  announcementFor,
  type Announcement,
  type CompletionLevel,
} from './celebration';
const voiceFiles: Record<Announcement, string> = {
  'one-shot': new URL('./assets/announcer/goal-in-one.mp3', import.meta.url).href,
  goal: new URL('./assets/announcer/goal.mp3', import.meta.url).href,
  'solid-effort': new URL('./assets/announcer/solid-effort.mp3', import.meta.url).href,
  disappointed: new URL('./assets/announcer/should-have-done-better.mp3', import.meta.url).href,
};
export class Audio {
  context: AudioContext | null = null;
  private muted = false;
  private output: GainNode | null = null;
  private voices = new Map<Announcement, AudioBuffer>();
  private loads = new Map<Announcement, Promise<AudioBuffer | null>>();
  private voiceEpoch = 0;
  private tones = new Set<OscillatorNode>();
  private duckUntil = 0;
  private speaking: AudioBufferSourceNode | null = null;
  private celebration = new CompletionCelebration();
  voiceVolume = 0.8;
  get enabled() {
    return !this.muted;
  }
  set enabled(value: boolean) {
    this.muted = !value;
    if (this.output && this.context)
      this.output.gain.setValueAtTime(value ? 1 : 0, this.context.currentTime);
    if (!value) this.stopVoice();
  }
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (!this.output) {
        this.output = this.context.createGain();
        this.output.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
      // Decode once following a user gesture. All four original clips total only 184 KB.
      for (const key of Object.keys(voiceFiles) as Announcement[]) void this.loadVoice(key);
    } catch {
      /* Silent play remains available. */
    }
  }
  private loadVoice(key: Announcement): Promise<AudioBuffer | null> {
    if (this.voices.has(key)) return Promise.resolve(this.voices.get(key)!);
    const existing = this.loads.get(key);
    if (existing) return existing;
    const ctx = this.context;
    if (!ctx) return Promise.resolve(null);
    const load = fetch(voiceFiles[key])
      .then((r) => {
        if (!r.ok) throw Error('Voice unavailable');
        return r.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        this.voices.set(key, buffer);
        return buffer;
      })
      .catch(() => null);
    this.loads.set(key, load);
    return load;
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
    gain.gain.linearRampToValueAtTime(volume * (t < this.duckUntil ? 0.22 : 1), t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.output ?? ctx.destination);
    this.tones.add(osc);
    osc.onended = () => this.tones.delete(osc);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }
  stopVoice() {
    this.voiceEpoch++;
    this.duckUntil = 0;
    for (const tone of this.tones) {
      try {
        tone.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.tones.clear();
    try {
      this.speaking?.stop();
    } catch {
      /* Already ended. */
    }
    this.speaking = null;
  }
  celebrate(shots: number, round: number, level?: CompletionLevel) {
    const kind = this.celebration.take(shots, round);
    if (!kind || !this.enabled) return;
    this.stopVoice();
    const line = level ? announcementFor(shots, level) : shots === 1 ? 'one-shot' : null;
    if (!line || !this.context) {
      this.play('win');
      return;
    }
    const epoch = this.voiceEpoch;
    const speak = (buffer: AudioBuffer | null) => {
      if (!this.enabled || epoch !== this.voiceEpoch) return;
      if (!buffer || !this.context) {
        this.play('win');
        return;
      }
      const source = this.context.createBufferSource(),
        gain = this.context.createGain();
      source.buffer = buffer;
      gain.gain.value = Math.max(0, Math.min(1, this.voiceVolume));
      source.connect(gain);
      gain.connect(this.output ?? this.context.destination);
      source.onended = () => {
        if (this.speaking === source) this.speaking = null;
      };
      this.speaking = source;
      this.duckUntil = this.context.currentTime + buffer.duration + 0.12;
      source.start();
      // Keep the familiar goal jingle underneath the recording, with no delayed tail.
      this.play('win');
    };
    const ready = this.voices.get(line);
    if (ready) speak(ready);
    else void this.loadVoice(line).then(speak);
  }

  play(type: string) {
    if (type === 'spring') {
      this.tone(230, 0.12, 'triangle');
      this.tone(720, 0.18, 'sine', 0.06, 0.05);
    }
    if (type === 'break') {
      this.tone(90, 0.15, 'sawtooth', 0.045);
    }
    if (type === 'switch') {
      this.tone(950, 0.1, 'sine', 0.04);
    }
    if (type === 'shot') this.tone(600, 0.13, 'triangle', 0.09);
    if (type === 'post') this.tone(1100, 0.22, 'sine', 0.06);
    if (type === 'net') {
      this.tone(210, 0.25, 'triangle', 0.035);
      this.tone(380, 0.15, 'sine', 0.02, 0.07);
    }
    if (type === 'fail') this.tone(140, 0.3, 'triangle', 0.04);
    if (type === 'hit') this.tone(190, 0.065, 'sine', 0.025);
    if (type === 'boost') {
      this.tone(340, 0.14, 'triangle');
      this.tone(680, 0.2, 'sine', 0.05, 0.06);
    }
    if (type === 'reset')
      for (let i = 0; i < 5; i++) this.tone(150 + i * 65, 0.15, 'sine', 0.04, i * 0.04);
    if (type === 'win')
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        this.tone(f, 0.4, 'triangle', 0.07, i * 0.12),
      );
    if (type === 'ui') this.tone(740, 0.065, 'sine', 0.03);
  }
}
