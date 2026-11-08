type Wave = OscillatorType;

interface Tone {
  freq: number;
  to?: number;
  dur: number;
  wave?: Wave;
  gain?: number;
  delay?: number;
}

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  /** The shared context and master bus, so the music can join the same output chain. */
  bus(): { ctx: AudioContext; master: GainNode } | null {
    const ctx = this.audio();
    return ctx && this.master ? { ctx, master: this.master } : null;
  }

  private audio(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone({ freq, to, dur, wave = "sine", gain = 0.4, delay = 0 }: Tone): void {
    const ctx = this.audio();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, gain: number, cutoff: number, delay = 0): void {
    const ctx = this.audio();
    if (!ctx || !this.master) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(this.master);
    src.start(ctx.currentTime + delay);
  }

  select(): void {
    this.tone({ freq: 660, to: 990, dur: 0.08, wave: "triangle", gain: 0.25 });
  }

  hover(): void {
    this.tone({ freq: 880, to: 940, dur: 0.035, wave: "sine", gain: 0.08 });
  }

  deselect(): void {
    this.tone({ freq: 500, to: 330, dur: 0.08, wave: "triangle", gain: 0.18 });
  }

  move(leap: boolean): void {
    if (leap) {
      this.noise(0.35, 0.25, 900);
      this.tone({ freq: 220, to: 520, dur: 0.3, wave: "sine", gain: 0.12 });
      return;
    }
    this.tone({ freq: 140, to: 90, dur: 0.09, wave: "square", gain: 0.08 });
    this.noise(0.06, 0.2, 1400);
  }

  capture(big: boolean): void {
    this.noise(big ? 1.1 : 0.45, big ? 0.9 : 0.55, big ? 600 : 1800);
    this.tone({ freq: big ? 110 : 180, to: 40, dur: big ? 0.9 : 0.35, wave: "sawtooth", gain: 0.25 });
    this.tone({ freq: 1200, to: 300, dur: 0.15, wave: "square", gain: 0.06 });
  }

  perish(): void {
    this.noise(1, 0.35, 500);
    this.tone({ freq: 300, to: 60, dur: 0.9, wave: "sine", gain: 0.15 });
  }

  promote(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.35, wave: "triangle", gain: 0.2, delay: i * 0.08 }));
  }

  terrain(): void {
    this.tone({ freq: 240, to: 180, dur: 0.12, wave: "triangle", gain: 0.2 });
    this.noise(0.08, 0.15, 2000);
  }

  turn(): void {
    this.tone({ freq: 196, dur: 0.5, wave: "sawtooth", gain: 0.08 });
    this.tone({ freq: 294, dur: 0.6, wave: "sawtooth", gain: 0.07, delay: 0.12 });
  }

  error(): void {
    this.tone({ freq: 140, dur: 0.15, wave: "square", gain: 0.1 });
  }

  victory(): void {
    [392, 523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.4, wave: "triangle", gain: 0.22, delay: i * 0.14 }));
  }

  defeat(): void {
    [392, 349, 311, 262].forEach((f, i) => this.tone({ freq: f, dur: 0.6, wave: "sawtooth", gain: 0.1, delay: i * 0.25 }));
  }
}

export const sfx = new Sfx();
