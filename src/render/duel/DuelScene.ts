import Phaser from "phaser";
import { reducedMotion } from "../ui/fonts";
import { duels, type DuelHost, type DuelRequest } from "./duel";
import { DuelStage } from "./DuelStage";
import { DuelRun, playDuel, showResult, tempoOf } from "./duelTimeline";

/**
 * The capture cutscene: a transparent scene over the battle that shows a letterboxed pixel-art
 * strip where the attacker lunges, the defender crumbles and the victor poses. It stays running
 * and idle between duels; `play` queues requests so two captures in one order run in turn. Any
 * key or click skips the current duel, and reduced-motion viewers see only the result.
 */
export class DuelScene extends Phaser.Scene implements DuelHost {
  private stage: DuelStage | null = null;
  private run: DuelRun | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor() {
    super("duel");
  }

  create(): void {
    const skip = (): void => this.run?.skip();
    this.input.on("pointerdown", skip);
    this.input.keyboard?.on("keydown", skip);
    duels.attach(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointerdown", skip);
      this.input.keyboard?.off("keydown", skip);
      duels.attach(null);
    });
  }

  update(_time: number, dt: number): void {
    this.stage?.scroll(dt * 0.05);
  }

  play(req: DuelRequest): Promise<void> {
    this.queue = this.queue.then(() => this.show(req)).catch(() => undefined);
    return this.queue;
  }

  private async show(req: DuelRequest): Promise<void> {
    this.scene.bringToTop();
    this.stage = new DuelStage(this, req);
    this.run = new DuelRun(this, tempoOf(req.mode ?? "full"));
    if (reducedMotion()) await this.still(this.stage, this.run);
    else await playDuel(this.stage, this.run);
    this.stage.destroy();
    this.stage = null;
    this.run = null;
  }

  /** Reduced motion: the result, held briefly, no lunge or shake. */
  private async still(stage: DuelStage, run: DuelRun): Promise<void> {
    showResult(stage);
    await run.wait(450);
    stage.root.setAlpha(0);
  }
}
