import type Phaser from "phaser";
import { reducedMotion } from "../../ui/fonts";

/** One beat of an intro: `run(false)` animates toward the end state, `run(true)` jumps to it. */
export type StepRun = (instant: boolean) => void;

interface Step {
  at: number;
  run: StepRun;
}

/**
 * A skippable timeline. Steps are scheduled by their offset; `skip()` cancels pending timers,
 * kills every tween created through `tween()` and runs every step instantly, so the end state is
 * reached no matter where the intro was. Reduced-motion viewers get a 4× compressed schedule.
 */
export class Sequence {
  private readonly steps: Step[] = [];
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  private readonly tweens: Phaser.Tweens.Tween[] = [];
  private finished = false;
  private onDone?: () => void;

  constructor(private readonly scene: Phaser.Scene) {}

  add(at: number, run: StepRun): this {
    this.steps.push({ at, run });
    return this;
  }

  /** Creates a tween the sequence owns, so `skip()` can kill it. */
  tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween {
    const t = this.scene.tweens.add(config);
    this.tweens.push(t);
    return t;
  }

  get done(): boolean {
    return this.finished;
  }

  play(onDone: () => void): void {
    this.onDone = onDone;
    if (this.finished) {
      onDone();
      return;
    }
    const scale = reducedMotion() ? 0.25 : 1;
    const last = Math.max(0, ...this.steps.map((s) => s.at));
    this.steps.forEach((s) => this.timers.push(this.scene.time.delayedCall(s.at * scale, () => s.run(false))));
    this.timers.push(this.scene.time.delayedCall(last * scale + 450 * scale, () => this.complete()));
  }

  /** Jumps to the end state; safe before `play()` too (then `play()` reports done at once). */
  skip(): void {
    if (this.finished) return;
    this.timers.forEach((t) => t.remove(false));
    this.tweens.forEach((t) => t.stop());
    this.steps.forEach((s) => s.run(true));
    this.complete();
  }

  private complete(): void {
    if (this.finished) return;
    this.finished = true;
    this.timers.length = 0;
    this.tweens.length = 0;
    this.onDone?.();
  }
}
