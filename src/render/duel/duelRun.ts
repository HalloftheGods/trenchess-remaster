import Phaser from "phaser";

/** What a run needs from the stage: one knob for the duel clock. */
export interface Clocked {
  setSpeed(s: number): void;
  readonly speed: number;
}

/**
 * One duel's clock. Every pause goes through `wait` (duel time, so slow motion stretches it) or
 * `real` (wall time, for hit-stop), and every animation through `tween` / `counter`. A skip
 * resolves all pending pauses at once and turns further tweens into no-ops, so the choreography
 * runs straight through to its end state without delay.
 */
export class DuelRun {
  private skipped = false;
  private pending: (() => void)[] = [];

  constructor(private scene: Phaser.Scene, private stage: Clocked, private tempo: number, readonly full: boolean) {}

  ms(n: number): number {
    return Math.round(n * this.tempo);
  }

  private hold(start: (done: () => void) => () => void): Promise<void> {
    if (this.skipped) return Promise.resolve();
    return new Promise((resolve) => {
      let cancel = (): void => undefined;
      const done = (): void => {
        this.pending = this.pending.filter((p) => p !== early);
        resolve();
      };
      const early = (): void => {
        cancel();
        resolve();
      };
      this.pending.push(early);
      cancel = start(done);
    });
  }

  /** Waits `n` ms of duel time, scaled by the tempo of the mode. */
  wait(n: number): Promise<void> {
    const ms = this.ms(n);
    if (ms <= 0) return Promise.resolve();
    return this.hold((done) => {
      const timer = this.scene.time.delayedCall(ms, done);
      return () => timer.remove(false);
    });
  }

  /** Waits `ms` of wall-clock time, whatever the duel clock is doing. */
  real(ms: number): Promise<void> {
    return this.hold((done) => {
      const id = window.setTimeout(done, ms);
      return () => window.clearTimeout(id);
    });
  }

  tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig & { duration: number }): Phaser.Tweens.Tween | null {
    if (this.skipped) return null;
    const delay = typeof cfg.delay === "number" ? this.ms(cfg.delay) : cfg.delay;
    return this.scene.tweens.add({ ...cfg, duration: Math.max(1, this.ms(cfg.duration)), delay });
  }

  /** Drives `fn(p)` with p running 0 → 1 over `n` ms; resolves when it ends (or at once on a skip). */
  counter(n: number, fn: (p: number) => void, ease = "Linear"): Promise<void> {
    if (this.skipped) return Promise.resolve();
    return this.hold((done) => {
      const tw = this.scene.tweens.addCounter({ from: 0, to: 1, duration: Math.max(1, this.ms(n)), ease, onUpdate: (t) => fn(t.getValue() ?? 0), onComplete: () => done() });
      return () => tw.stop();
    });
  }

  /** Freezes the duel clock for a beat of wall time: the weight of a blow. */
  async hitStop(ms: number): Promise<void> {
    if (this.skipped) return;
    const before = this.stage.speed;
    this.stage.setSpeed(0.02);
    await this.real(this.full ? ms : ms * 0.6);
    if (!this.skipped) this.stage.setSpeed(before);
  }

  /** Slow motion (full duels only): the duel clock runs at `s` until `normal()`. */
  slow(s: number): void {
    if (this.full && !this.skipped) this.stage.setSpeed(s);
  }

  normal(): void {
    if (!this.skipped) this.stage.setSpeed(1);
  }

  skip(): void {
    if (this.skipped) return;
    this.skipped = true;
    this.tempo = 0;
    this.stage.setSpeed(1);
    this.pending.splice(0).forEach((p) => p());
  }

  get isSkipped(): boolean {
    return this.skipped;
  }
}
