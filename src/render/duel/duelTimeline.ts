import Phaser from "phaser";
import { sfx } from "../../audio/sfx";
import { FACTIONS } from "../art/unitArt";
import type { DuelMode } from "./duel";
import type { DuelStage, Fighter } from "./DuelStage";

/** Tempo of each mode: "full" ≈ 1.6 s, "fast" ≈ 0.7 s. */
const TEMPO: Record<DuelMode, number> = { off: 0, fast: 0.42, full: 1 };

const tint = (f: Fighter): number => Phaser.Display.Color.HexStringToColor(FACTIONS[f.unit.owner].css).color;

/**
 * One duel's clock. Every pause goes through `wait`, so a skip (any key or click) resolves them
 * all at once and the sequence runs to its end state without further delay.
 */
export class DuelRun {
  private skipped = false;
  private pending: (() => void)[] = [];

  constructor(private scene: Phaser.Scene, private tempo: number) {}

  ms(n: number): number {
    return Math.round(n * this.tempo);
  }

  wait(n: number): Promise<void> {
    const ms = this.ms(n);
    if (this.skipped || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = this.scene.time.delayedCall(ms, () => {
        this.pending = this.pending.filter((p) => p !== done);
        resolve();
      });
      const done = (): void => {
        timer.remove(false);
        resolve();
      };
      this.pending.push(done);
    });
  }

  tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig & { duration: number }): void {
    if (this.skipped) return;
    const scaled: Phaser.Types.Tweens.TweenBuilderConfig = { ...cfg, duration: this.ms(cfg.duration) };
    this.scene.tweens.add(scaled);
  }

  skip(): void {
    if (this.skipped) return;
    this.skipped = true;
    this.tempo = 0;
    this.pending.splice(0).forEach((p) => p());
  }

  get isSkipped(): boolean {
    return this.skipped;
  }
}

const slideIn = async (stage: DuelStage, run: DuelRun): Promise<void> => {
  const w = stage.root.scene.scale.width;
  for (const f of [stage.attacker, stage.defender]) {
    f.sprite.setX(f.home - f.dir * w * 0.3);
    f.plate.setAlpha(0);
    run.tween({ targets: f.sprite, x: f.home, duration: 260, ease: "Cubic.Out" });
    run.tween({ targets: f.plate, alpha: 1, duration: 200, delay: run.ms(120) });
  }
  stage.root.setAlpha(0);
  run.tween({ targets: stage.root, alpha: 1, duration: 140 });
  sfx.hover();
  await run.wait(300);
};

const lunge = async (stage: DuelStage, run: DuelRun): Promise<void> => {
  const a = stage.attacker;
  stage.frame(a, "lunge1");
  await run.wait(90);
  stage.frame(a, "lunge2");
  sfx.move(false);
  run.tween({ targets: a.sprite, x: stage.lungeX(), duration: 170, ease: "Quad.In" });
  await run.wait(170);
};

const impact = async (stage: DuelStage, run: DuelRun): Promise<void> => {
  const d = stage.defender;
  stage.frame(d, "hit");
  const { x, y } = stage.chest(d);
  stage.burst(x, y, 0xffffff, 18);
  stage.flashOnce(run.ms(160));
  stage.root.scene.cameras.main.shake(run.ms(220), d.unit.type === "king" ? 0.018 : 0.01);
  sfx.capture(true);
  run.tween({ targets: d.sprite, x: d.home - d.dir * stage.k * 3, duration: 60, yoyo: true, repeat: 2 });
  await run.wait(220);
};

const crumble = async (stage: DuelStage, run: DuelRun): Promise<void> => {
  const d = stage.defender;
  const { x, y } = stage.chest(d);
  stage.burst(x, y, tint(d), 48);
  run.tween({ targets: d.sprite, alpha: 0, scaleY: 0.2, y: d.sprite.y + stage.k * 2, duration: 280, ease: "Quad.In" });
  run.tween({ targets: d.plate, alpha: 0.25, duration: 280 });
  await run.wait(320);
};

const pose = async (stage: DuelStage, run: DuelRun): Promise<void> => {
  const a = stage.attacker;
  run.tween({ targets: a.sprite, x: a.home, duration: 160, ease: "Quad.Out" });
  for (let i = 0; i < 2; i++) {
    stage.frame(a, "lunge1");
    run.tween({ targets: a.sprite, y: stage.floor - stage.k * 3, duration: 90, yoyo: true });
    await run.wait(120);
    stage.frame(a, "idle");
    await run.wait(120);
  }
};

/** The final picture of a duel, for reduced-motion viewers and for a skip: the victor alone. */
export const showResult = (stage: DuelStage): void => {
  stage.freeze();
  stage.root.setAlpha(1);
  stage.attacker.sprite.setX(stage.attacker.home).setY(stage.floor);
  stage.attacker.plate.setAlpha(1);
  stage.frame(stage.attacker, "idle");
  stage.defender.sprite.setAlpha(0);
  stage.defender.plate.setAlpha(0.25);
};

export const tempoOf = (mode: DuelMode): number => TEMPO[mode];

/** Plays the whole duel on `stage` and resolves when the strip has faded out. */
export const playDuel = async (stage: DuelStage, run: DuelRun): Promise<void> => {
  await slideIn(stage, run);
  await lunge(stage, run);
  await impact(stage, run);
  await crumble(stage, run);
  await pose(stage, run);
  if (run.isSkipped) showResult(stage);
  await fadeOut(stage, run.isSkipped ? 110 : run.ms(200));
};

const fadeOut = (stage: DuelStage, ms: number): Promise<void> =>
  new Promise((resolve) => stage.root.scene.tweens.add({ targets: stage.root, alpha: 0, duration: ms, ease: "Quad.In", onComplete: () => resolve() }));
