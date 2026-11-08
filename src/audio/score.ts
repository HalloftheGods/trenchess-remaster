const BPM = 72;
const BEAT = 60 / BPM;
const LOOKAHEAD = 0.25;
const TICK_MS = 90;

/** D dorian, voiced low to high. */
const SCALE = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0, 440.0, 523.25, 587.33];
/** Chord roots as scale degrees: i, VII, III, IV. */
const CHORDS: number[][] = [[0, 2, 4], [1, 3, 6], [2, 4, 7], [3, 5, 8]];

interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
}

/**
 * "Trench Ambience": a generative score that fills in whenever the playlist has no track to
 * play. Slow detuned pads under a wandering filter, plucked arpeggios through a dotted delay,
 * and a soft sub pulse so visuals have a beat to follow.
 */
export class Score {
  private out: GainNode;
  private pads: Voice[] = [];
  private delay: DelayNode | null = null;
  private timer = 0;
  private nextBeat = 0;
  private beatIndex = 0;
  private intensity = 0.5;
  private onBeat: () => void = () => undefined;

  constructor(private ctx: AudioContext, into: AudioNode, onBeat?: () => void) {
    this.out = ctx.createGain();
    this.out.gain.value = 0.0001;
    this.out.connect(into);
    if (onBeat) this.onBeat = onBeat;
  }

  start(): void {
    if (this.timer) return;
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.out.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.out.gain.exponentialRampToValueAtTime(0.9, this.ctx.currentTime + 3);
    if (this.pads.length === 0) {
      this.buildPads();
      this.buildDelay();
    }
    this.nextBeat = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), TICK_MS);
  }

  stop(): void {
    if (!this.timer) return;
    window.clearInterval(this.timer);
    this.timer = 0;
    this.out.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
    this.pads.forEach((v) => v.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.5));
  }

  get playing(): boolean {
    return this.timer !== 0;
  }

  /** 0 = sparse title ambience, 1 = full battle score. */
  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v));
  }

  private buildPads(): void {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    filter.Q.value = 0.8;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    filter.connect(this.out);
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      osc.type = i === 1 ? "triangle" : "sawtooth";
      osc.detune.value = (i - 1) * 7;
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain).connect(filter);
      osc.start();
      this.pads.push({ osc, gain });
    }
  }

  private buildDelay(): void {
    const ctx = this.ctx;
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 1800;
    this.delay.connect(tone).connect(fb).connect(this.delay);
    this.delay.connect(this.out);
  }

  private schedule(): void {
    while (this.nextBeat < this.ctx.currentTime + LOOKAHEAD) {
      this.playBeat(this.nextBeat, this.beatIndex);
      this.nextBeat += BEAT;
      this.beatIndex += 1;
    }
  }

  private playBeat(t: number, i: number): void {
    const bar = Math.floor(i / 4);
    const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length];
    if (i % 8 === 0) this.voicePad(t, chord);
    if (i % 2 === 0) this.pulse(t);
    const arpChance = 0.25 + this.intensity * 0.5;
    const offbeat = Math.random() < 0.3 ? BEAT / 2 : 0;
    if (Math.random() < arpChance) this.pluck(t + offbeat, chord);
    if (this.intensity > 0.6 && i % 4 === 2) this.pluck(t + BEAT / 2, chord, true);
    window.setTimeout(() => this.onBeat(), Math.max(0, t - this.ctx.currentTime) * 1000);
  }

  private voicePad(t: number, chord: number[]): void {
    this.pads.forEach((v, i) => {
      v.osc.frequency.setTargetAtTime(SCALE[chord[i]] / 2, t, 0.6);
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setTargetAtTime(0.028 + this.intensity * 0.012, t, 1.2);
    });
  }

  private pulse(t: number): void {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(70, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09 + this.intensity * 0.06, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    osc.connect(g).connect(this.out);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  private pluck(t: number, chord: number[], high = false): void {
    const pool = high ? chord.map((d) => d + 5) : [...chord, chord[0] + 7];
    const degree = pool[Math.floor(Math.random() * pool.length)];
    const freq = SCALE[Math.min(degree, SCALE.length - 1)];
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq * 2;
    bp.Q.value = 1.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(bp).connect(g);
    g.connect(this.out);
    if (this.delay) g.connect(this.delay);
    osc.start(t);
    osc.stop(t + 1);
  }
}
