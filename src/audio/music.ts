import { sfx } from "./sfx";
import { tracksFor, type Mood, type Track } from "./playlist";
import { Score } from "./score";

/** Smoothed loudness per band, 0..1, plus a beat flag on frames where the bass just jumped. */
export interface Levels {
  bass: number;
  mid: number;
  high: number;
  beat: boolean;
}

const FADE = 1.2;

/**
 * Streams the soundtrack through the shared audio bus with an analyser on it, so visuals can
 * follow the music. Tracks come from src/audio/playlist.ts; with none listed it stays silent.
 */
class Music {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private bins: Uint8Array<ArrayBuffer> | null = null;
  private element: HTMLAudioElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private mood: Mood = "title";
  private queue: Track[] = [];
  private smooth: Levels = { bass: 0, mid: 0, high: 0, beat: false };
  private lastBass = 0;
  private score: Score | null = null;
  private scoreBeatAt = 0;

  /** Starts (or resumes) the music for the current mood. Needs a user gesture to have happened. */
  start(): void {
    if (!this.ready()) return;
    if (this.playing) return;
    if (this.element?.paused && this.element.currentTime > 0) {
      void this.element.play().catch(() => undefined);
      return;
    }
    this.next();
  }

  stop(): void {
    if (!this.ctx || !this.out) return;
    this.out.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
    this.score?.stop();
    const el = this.element;
    window.setTimeout(() => el?.pause(), FADE * 1000);
  }

  setMood(mood: Mood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    this.queue = [];
    this.score?.setIntensity(mood === "battle" ? 0.85 : 0.35);
    if (this.playing) this.crossfade();
  }

  get playing(): boolean {
    const track = this.element !== null && !this.element.paused;
    return track || this.score?.playing === true;
  }

  get nowPlaying(): string {
    if (this.score?.playing) return "Trench Ambience";
    return this.element?.dataset.title ?? "";
  }

  /** Current band levels for visuals; cheap enough to call every frame. */
  levels(): Levels {
    if (!this.analyser || !this.bins || !this.playing) {
      this.smooth.beat = false;
      return this.smooth;
    }
    this.analyser.getByteFrequencyData(this.bins);
    const band = (from: number, to: number): number => {
      let sum = 0;
      for (let i = from; i < to; i++) sum += this.bins![i];
      return sum / ((to - from) * 255);
    };
    const bass = band(1, 6);
    const mid = band(6, 30);
    const high = Math.min(1, band(30, 90) * 2.2);
    const scoreBeat = performance.now() - this.scoreBeatAt < 60;
    this.smooth.beat = scoreBeat || (bass - this.lastBass > 0.12 && bass > 0.5);
    this.lastBass = bass;
    this.smooth.bass += (bass - this.smooth.bass) * 0.25;
    this.smooth.mid += (mid - this.smooth.mid) * 0.2;
    this.smooth.high += (high - this.smooth.high) * 0.2;
    return this.smooth;
  }

  private ready(): boolean {
    if (this.ctx) return true;
    const bus = sfx.bus();
    if (!bus) return false;
    this.ctx = bus.ctx;
    this.out = bus.ctx.createGain();
    this.out.gain.value = 0.0001;
    this.analyser = bus.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.7;
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.out.connect(this.analyser).connect(bus.master);
    this.element = new Audio();
    this.element.crossOrigin = "anonymous";
    this.element.preload = "auto";
    this.element.onended = () => this.next();
    this.element.onerror = () => this.next();
    this.source = bus.ctx.createMediaElementSource(this.element);
    this.source.connect(this.out);
    this.score = new Score(bus.ctx, this.out, () => (this.scoreBeatAt = performance.now()));
    return true;
  }

  private pick(): Track | null {
    if (this.queue.length === 0) {
      const pool = tracksFor(this.mood);
      this.queue = pool.slice().sort(() => Math.random() - 0.5);
    }
    return this.queue.shift() ?? null;
  }

  private next(): void {
    const track = this.pick();
    if (!this.element || !this.ctx || !this.out) return;
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), this.ctx.currentTime);
    this.out.gain.exponentialRampToValueAtTime(0.8, this.ctx.currentTime + FADE);
    if (!track) {
      this.element.pause();
      this.score?.start();
      return;
    }
    this.score?.stop();
    this.element.src = `${import.meta.env.BASE_URL}music/${track.file}`;
    this.element.dataset.title = track.title;
    void this.element.play().catch(() => undefined);
  }

  private crossfade(): void {
    if (!this.ctx || !this.out) return;
    this.out.gain.setTargetAtTime(0.0001, this.ctx.currentTime, FADE / 3);
    window.setTimeout(() => this.next(), FADE * 1000);
  }
}

export const music = new Music();
