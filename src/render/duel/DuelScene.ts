import Phaser from "phaser";
import { duels, type DuelHost, type DuelRequest } from "./duel";
import { paintDuelFx } from "./duelFx";
import { DuelRun } from "./duelRun";
import { DuelStage } from "./DuelStage";
import { playDuel, tempoOf } from "./duelTimeline";

/**
 * The capture cutscene: a full-screen 2D battle over the board. The letterbox closes, the two
 * chessmen take the field on a parallax battlefield of the defender's terrain, the attacker
 * performs its classic ability, the defender breaks apart and the victor poses. It runs two
 * cameras: the main one (world: zooms, shakes) and a steady one for the HUD. It stays idle
 * between duels; `play` queues requests so two captures in one order run in turn. Any key or
 * click skips to the result. It always plays in full, whatever the OS reduced-motion setting.
 */
export class DuelScene extends Phaser.Scene implements DuelHost {
  private stage: DuelStage | null = null;
  private run: DuelRun | null = null;
  private queue: Promise<void> = Promise.resolve();
  private world!: Phaser.GameObjects.Container;
  private ui!: Phaser.GameObjects.Container;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;

  constructor() {
    super("duel");
  }

  create(): void {
    paintDuelFx(this);
    this.world = this.add.container(0, 0);
    this.ui = this.add.container(0, 0);
    this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height, false, "duel-ui");
    this.cameras.main.ignore(this.ui);
    this.uiCam.ignore(this.world);
    const resize = (size: Phaser.Structs.Size): void => {
      this.cameras.main.setSize(size.width, size.height);
      this.uiCam.setSize(size.width, size.height);
    };
    this.scale.on("resize", resize);
    const skip = (): void => this.run?.skip();
    this.input.on("pointerdown", skip);
    this.input.keyboard?.on("keydown", skip);
    duels.attach(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", resize);
      this.input.off("pointerdown", skip);
      this.input.keyboard?.off("keydown", skip);
      duels.attach(null);
    });
  }

  update(_time: number, dt: number): void {
    this.stage?.tick(dt);
  }

  play(req: DuelRequest): Promise<void> {
    this.queue = this.queue.then(() => this.show(req)).catch((e: unknown) => console.error("duel", e));
    return this.queue;
  }

  private async show(req: DuelRequest): Promise<void> {
    this.scene.bringToTop();
    const stage = new DuelStage(this, this.world, this.ui, req);
    const mode = req.mode ?? "full";
    const run = new DuelRun(this, stage, tempoOf(mode), mode === "full");
    this.stage = stage;
    this.run = run;
    try {
      await playDuel({ s: stage, r: run });
    } finally {
      this.stage = null;
      this.run = null;
      stage.destroy();
    }
  }
}
