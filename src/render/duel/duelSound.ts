import { sfx } from "../../audio/sfx";

type Bus = { ctx: AudioContext; master: GainNode };

interface Voice {
  freq: number;
  to?: number;
  dur: number;
  wave?: OscillatorType;
  gain?: number;
  delay?: number;
  attack?: number;
  /** Send to the hall reverb, 0..1. */
  wet?: number;
}

interface Hiss {
  dur: number;
  gain: number;
  type?: BiquadFilterType;
  from: number;
  to?: number;
  q?: number;
  delay?: number;
  wet?: number;
  attack?: number;
}

/**
 * Layered, synthesised sound for the duel: whooshes, hits, metal, hooves, choirs and stings,
 * built on the game's shared audio bus (so the mute button covers it) with a small generated
 * hall reverb for weight. Every cue is a few oscillators and filtered noise bursts.
 */
class DuelSound {
  private hall: ConvolverNode | null = null;
  private hallFor: AudioContext | null = null;

  private bus(): Bus | null {
    return sfx.bus();
  }

  private reverb(b: Bus): ConvolverNode {
    if (this.hall && this.hallFor === b.ctx) return this.hall;
    const len = Math.floor(b.ctx.sampleRate * 1.8);
    const ir = b.ctx.createBuffer(2, len, b.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const conv = b.ctx.createConvolver();
    conv.buffer = ir;
    const wet = b.ctx.createGain();
    wet.gain.value = 0.45;
    conv.connect(wet).connect(b.master);
    this.hall = conv;
    this.hallFor = b.ctx;
    return conv;
  }

  private out(b: Bus, node: AudioNode, wet = 0.25): void {
    node.connect(b.master);
    if (wet <= 0) return;
    const send = b.ctx.createGain();
    send.gain.value = wet;
    node.connect(send).connect(this.reverb(b));
  }

  private voice({ freq, to, dur, wave = "sine", gain = 0.3, delay = 0, attack = 0.005, wet = 0.2 }: Voice): void {
    const b = this.bus();
    if (!b) return;
    const t0 = b.ctx.currentTime + delay;
    const osc = b.ctx.createOscillator();
    const g = b.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    this.out(b, g, wet);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private hiss({ dur, gain, type = "bandpass", from, to, q = 1, delay = 0, wet = 0.2, attack = 0.005 }: Hiss): void {
    const b = this.bus();
    if (!b) return;
    const t0 = b.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(b.ctx.sampleRate * dur));
    const buf = b.ctx.createBuffer(1, len, b.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = b.ctx.createBufferSource();
    src.buffer = buf;
    const filter = b.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t0);
    if (to) filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = b.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g);
    this.out(b, g, wet);
    src.start(t0);
  }

  /** The battle sting as the letterbox closes: a drum hit and a low brass stab. */
  open(): void {
    this.voice({ freq: 70, to: 38, dur: 0.6, gain: 0.5, wet: 0.4 });
    this.hiss({ dur: 0.5, gain: 0.35, type: "lowpass", from: 900, to: 120, wet: 0.5 });
    [98, 147, 196, 247].forEach((f) => this.voice({ freq: f, dur: 0.9, wave: "sawtooth", gain: 0.06, attack: 0.03, delay: 0.05, wet: 0.5 }));
  }

  whoosh(dur = 0.28, gain = 0.32): void {
    this.hiss({ dur, gain, from: 300, to: 2600, q: 0.8, attack: dur * 0.6, wet: 0.1 });
  }

  spin(): void {
    for (let i = 0; i < 3; i++) this.hiss({ dur: 0.16, gain: 0.28, from: 500, to: 2400, q: 1.2, delay: i * 0.12, attack: 0.1, wet: 0.1 });
  }

  step(heavy: boolean): void {
    this.voice({ freq: heavy ? 80 : 120, to: 40, dur: heavy ? 0.3 : 0.12, gain: heavy ? 0.5 : 0.22, wet: 0.2 });
    this.hiss({ dur: 0.1, gain: heavy ? 0.3 : 0.12, type: "lowpass", from: 700, wet: 0.1 });
  }

  hoof(i: number, delay = 0): void {
    this.voice({ freq: 260 + (i % 2) * 40, to: 110, dur: 0.07, wave: "square", gain: 0.06, wet: 0.15, delay });
    this.hiss({ dur: 0.05, gain: 0.16, type: "lowpass", from: 1200, wet: 0.1, delay });
  }

  /** A gallop of `n` hoofbeats spread over `ms`. */
  gallop(n: number, ms: number): void {
    for (let i = 0; i < n; i++) this.hoof(i, (i * ms) / n / 1000);
  }

  neigh(): void {
    this.voice({ freq: 700, to: 1300, dur: 0.25, wave: "sawtooth", gain: 0.05, wet: 0.4 });
    this.voice({ freq: 1250, to: 520, dur: 0.5, wave: "sawtooth", gain: 0.05, delay: 0.22, wet: 0.4 });
    this.hiss({ dur: 0.6, gain: 0.08, from: 1800, q: 3, wet: 0.3 });
  }

  charge(ms: number): void {
    const d = ms / 1000;
    this.voice({ freq: 180, to: 720, dur: d, wave: "triangle", gain: 0.12, attack: d * 0.8, wet: 0.4 });
    this.hiss({ dur: d, gain: 0.12, from: 400, to: 4000, q: 4, attack: d * 0.8, wet: 0.3 });
  }

  /** The Light Seer's rising choir. */
  choir(): void {
    [440, 554, 659, 880].forEach((f, i) => {
      this.voice({ freq: f, dur: 1.1, gain: 0.07, attack: 0.25, delay: i * 0.04, wet: 0.8 });
      this.voice({ freq: f * 1.006, dur: 1.1, wave: "triangle", gain: 0.04, attack: 0.3, delay: i * 0.04, wet: 0.8 });
    });
  }

  beam(): void {
    this.voice({ freq: 1600, to: 180, dur: 0.5, wave: "sawtooth", gain: 0.08, wet: 0.6 });
    this.hiss({ dur: 0.6, gain: 0.25, from: 6000, to: 800, q: 0.7, wet: 0.5 });
  }

  /** Blade meets body: a crack, a thump and a ring of metal. `power` 0..1. */
  hit(power: number): void {
    this.voice({ freq: 110 + 40 * (1 - power), to: 36, dur: 0.25 + power * 0.4, gain: 0.35 + power * 0.3, wet: 0.3 });
    this.hiss({ dur: 0.08 + power * 0.1, gain: 0.5, type: "highpass", from: 2400, wet: 0.2 });
    this.hiss({ dur: 0.3 + power * 0.5, gain: 0.25 + power * 0.25, type: "lowpass", from: 1400, to: 200, wet: 0.4 });
    this.voice({ freq: 1870, dur: 0.35, wave: "triangle", gain: 0.05, wet: 0.5 });
    this.voice({ freq: 2790, dur: 0.25, wave: "sine", gain: 0.04, wet: 0.5 });
  }

  slash(): void {
    this.hiss({ dur: 0.14, gain: 0.35, type: "highpass", from: 1800, to: 5000, attack: 0.05, wet: 0.1 });
    this.voice({ freq: 2200, to: 700, dur: 0.12, wave: "sawtooth", gain: 0.025, wet: 0.1 });
  }

  quake(): void {
    this.voice({ freq: 55, to: 28, dur: 0.9, gain: 0.55, wet: 0.5 });
    this.hiss({ dur: 0.9, gain: 0.4, type: "lowpass", from: 500, to: 80, wet: 0.5 });
  }

  /** The defender breaking apart: glassy shards over a low boom. */
  shatter(big: boolean): void {
    this.hiss({ dur: 0.5, gain: 0.25, type: "highpass", from: 3500, wet: 0.5 });
    for (let i = 0; i < 7; i++) this.voice({ freq: 1800 + Math.random() * 2600, dur: 0.12 + Math.random() * 0.2, wave: "triangle", gain: 0.035, delay: Math.random() * 0.25, wet: 0.6 });
    this.voice({ freq: big ? 70 : 100, to: 30, dur: big ? 1.4 : 0.7, gain: big ? 0.6 : 0.35, wet: 0.6 });
  }

  glint(): void {
    this.voice({ freq: 2637, dur: 0.4, wave: "sine", gain: 0.07, wet: 0.7 });
    this.voice({ freq: 3951, dur: 0.3, wave: "sine", gain: 0.04, delay: 0.05, wet: 0.7 });
  }

  /** The victor's short fanfare. */
  fanfare(grand: boolean): void {
    const notes = grand ? [392, 523, 659, 784, 1046] : [523, 659, 784];
    notes.forEach((f, i) => {
      this.voice({ freq: f, dur: 0.45, wave: "sawtooth", gain: 0.05, attack: 0.02, delay: i * 0.09, wet: 0.5 });
      this.voice({ freq: f / 2, dur: 0.45, wave: "triangle", gain: 0.08, delay: i * 0.09, wet: 0.5 });
    });
  }

  close(): void {
    this.hiss({ dur: 0.25, gain: 0.2, from: 2400, to: 300, q: 0.8, wet: 0.2 });
  }
}

export const duelSound = new DuelSound();
