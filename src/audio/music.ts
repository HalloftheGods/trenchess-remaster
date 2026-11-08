import { sfx } from "./sfx";
import { Deck, type Mood, type Track } from "./playlist";
import { Score } from "./score";

/** Smoothed loudness per band, 0..1, plus a beat flag on frames where the bass just jumped. */
export interface Levels {
  bass: number;
  mid: number;
  high: number;
  beat: boolean;
}

export type MusicListener = () => void;

const FADE = 1.2;
const VOLUME_KEY = "trenchess-volume";
const SHUFFLE_KEY = "trenchess-shuffle";
const AMBIENCE: Track = { title: "Trench Ambience", file: "", mood: "title" };

const stored = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const store = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode: the setting lives for this session only */
  }
};

const storedVolume = (): number => {
  const v = Number(stored(VOLUME_KEY));
  return Number.isFinite(v) && stored(VOLUME_KEY) !== null ? Math.min(1, Math.max(0, v)) : 0.8;
};

/**
 * Streams the soundtrack through the shared audio bus with an analyser on it, so visuals can
 * follow the music. Tracks come from src/audio/playlist.ts; with none listed, the generative
 * "Trench Ambience" score fills in. The chain is source → pre (analyser tap) → fade → vol → bus,
 * so `levels()` keeps dancing whatever the volume, and a pause leaves the fade gain alone.
 */
class Music {
  private ctx: AudioContext | null = null;
  private pre: GainNode | null = null;
  private fade: GainNode | null = null;
  private vol: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private bins: Uint8Array<ArrayBuffer> | null = null;
  private element: HTMLAudioElement | null = null;
  private deck = new Deck("title", stored(SHUFFLE_KEY) !== "0");
  private smooth: Levels = { bass: 0, mid: 0, high: 0, beat: false };
  private lastBass = 0;
  private score: Score | null = null;
  private scoreBeatAt = 0;
  private sampledAt = 0;
  private level = storedVolume();
  private listeners = new Set<MusicListener>();
  private held = false;

  /**
   * Starts (or resumes) the music for the current mood. Needs a user gesture to have happened.
   * A pause made with `toggle()` holds: only another `toggle()` resumes it.
   */
  start(): void {
    if (!this.ready()) return;
    if (this.playing || this.held) return;
    this.resume();
  }

  /** Fades out and pauses; `start()` or `toggle()` picks up again. */
  stop(): void {
    if (!this.ctx || !this.fade) return;
    this.fade.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
    this.score?.stop();
    const el = this.element;
    window.setTimeout(() => {
      el?.pause();
      this.changed();
    }, FADE * 1000);
  }

  /** Pause / resume without a long fade, keeping the current track and position. */
  toggle(): void {
    if (!this.ready()) return;
    this.held = this.playing;
    if (this.held) {
      this.element?.pause();
      this.score?.stop();
      this.changed();
      return;
    }
    this.resume();
  }

  next(): void {
    if (!this.ready()) return;
    this.play(this.deck.next());
  }

  prev(): void {
    if (!this.ready()) return;
    this.play(this.deck.prev());
  }

  setMood(mood: Mood): void {
    if (mood === this.deck.mood) return;
    this.deck.setMood(mood);
    this.score?.setIntensity(mood === "battle" ? 0.85 : 0.35);
    if (this.playing) this.crossfade();
  }

  get playing(): boolean {
    const track = this.element !== null && !this.element.paused;
    return track || this.score?.playing === true;
  }

  get nowPlaying(): string {
    return this.track?.title ?? "";
  }

  /** The current track, "Trench Ambience" while the generative score plays, null before start. */
  get track(): Track | null {
    if (this.score?.playing) return AMBIENCE;
    return this.deck.track;
  }

  get volume(): number {
    return this.level;
  }

  set volume(v: number) {
    this.level = Math.min(1, Math.max(0, v));
    store(VOLUME_KEY, this.level.toFixed(3));
    if (this.vol && this.ctx) this.vol.gain.setTargetAtTime(Math.max(0.0001, this.level), this.ctx.currentTime, 0.03);
    this.changed();
  }

  get shuffle(): boolean {
    return this.deck.shuffle;
  }

  set shuffle(on: boolean) {
    this.deck.shuffle = on;
    store(SHUFFLE_KEY, on ? "1" : "0");
    this.changed();
  }

  /** Subscribes to track / play-state / volume changes; returns the unsubscribe function. */
  onChange(cb: MusicListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Current band levels for visuals; cheap enough to call every frame (memoised per frame). */
  levels(): Levels {
    const now = performance.now();
    if (now - this.sampledAt < 8) return this.smooth;
    this.sampledAt = now;
    if (!this.analyser || !this.bins || !this.playing) {
      this.smooth.beat = false;
      this.smooth.bass *= 0.9;
      this.smooth.mid *= 0.9;
      this.smooth.high *= 0.9;
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
    const scoreBeat = now - this.scoreBeatAt < 60;
    this.smooth.beat = scoreBeat || (bass - this.lastBass > 0.12 && bass > 0.5);
    this.lastBass = bass;
    this.smooth.bass += (bass - this.smooth.bass) * 0.25;
    this.smooth.mid += (mid - this.smooth.mid) * 0.2;
    this.smooth.high += (high - this.smooth.high) * 0.2;
    return this.smooth;
  }

  private changed(): void {
    this.listeners.forEach((cb) => cb());
  }

  private ready(): boolean {
    if (this.ctx) return true;
    const bus = sfx.bus();
    if (!bus) return false;
    this.ctx = bus.ctx;
    this.pre = bus.ctx.createGain();
    this.fade = bus.ctx.createGain();
    this.fade.gain.value = 0.0001;
    this.vol = bus.ctx.createGain();
    this.vol.gain.value = Math.max(0.0001, this.level);
    this.analyser = bus.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.7;
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.pre.connect(this.analyser);
    this.pre.connect(this.fade).connect(this.vol).connect(bus.master);
    this.element = new Audio();
    this.element.crossOrigin = "anonymous";
    this.element.preload = "auto";
    this.element.onended = () => this.next();
    this.element.onerror = () => this.next();
    this.element.onplaying = () => this.changed();
    this.element.onpause = () => this.changed();
    bus.ctx.createMediaElementSource(this.element).connect(this.pre);
    this.score = new Score(bus.ctx, this.pre, () => (this.scoreBeatAt = performance.now()));
    return true;
  }

  /** Resumes the paused track where it stopped or, with nothing loaded yet, starts the next one. */
  private resume(): void {
    if (this.deck.track && this.element) {
      this.fadeIn();
      void this.element.play().catch(() => undefined);
      return;
    }
    this.next();
  }

  private fadeIn(): void {
    if (!this.ctx || !this.fade) return;
    this.fade.gain.cancelScheduledValues(this.ctx.currentTime);
    this.fade.gain.setValueAtTime(Math.max(0.0001, this.fade.gain.value), this.ctx.currentTime);
    this.fade.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + FADE);
  }

  private play(track: Track | null): void {
    if (!this.element || !this.ctx) return;
    this.fadeIn();
    if (!track) {
      this.element.pause();
      this.score?.start();
      this.changed();
      return;
    }
    this.score?.stop();
    this.element.src = `${import.meta.env.BASE_URL}music/${track.file}`;
    void this.element.play().catch(() => undefined);
    this.changed();
  }

  private crossfade(): void {
    if (!this.ctx || !this.fade) return;
    this.fade.gain.setTargetAtTime(0.0001, this.ctx.currentTime, FADE / 3);
    window.setTimeout(() => this.next(), FADE * 1000);
  }
}

export const music = new Music();
