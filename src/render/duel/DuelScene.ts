import Phaser from "phaser";
import { duels, type DuelHost, type DuelRequest } from "./duel";
import { paintFx } from "./duelFx";
import { DuelRun } from "./duelRun";
import { DuelStage } from "./DuelStage";
import { playDuel, tempoOf } from "./duelTimeline";
import { SCREEN_H, TILE_W } from "./pixel/painter";

/**
 * The capture cutscene: a full-screen pixel-art battle over the board, in the style of the
 * 16-bit tactics games. The world is a low-res container (never on the display list) that is
 * drawn every frame into one render texture, shown at an integer scale with nearest sampling.
 * The curtain closes, the two chessmen run onto a parallax battlefield of the defender's
 * terrain, the attacker performs its classic ability, the defender breaks apart and the victor
 * poses. It stays idle between duels; `play` queues requests so two captures in one order run
 * in turn. Any key or click skips to the result. It always plays, whatever the OS motion setting.
 */
export class DuelScene extends Phaser.Scene implements DuelHost {
  private stage: DuelStage | null = null;
  private run: DuelRun | null = null;
  private queue: Promise<void> = Promise.resolve();
  private world!: Phaser.GameObjects.Container;
  private screen!: Phaser.GameObjects.RenderTexture;
  private matte!: Phaser.GameObjects.Rectangle;

  constructor() {
    super("duel");
  }

  create(): void {
    paintFx(this);
    this.world = this.make.container({ x: 0, y: 0 }, false);
    this.matte = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x05060a).setOrigin(0, 0).setVisible(false);
    this.screen = this.add.renderTexture(0, 0, TILE_W, SCREEN_H).setOrigin(0.5).setVisible(false);
    this.screen.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
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
    this.stage?.tick(dt);
  }

  play(req: DuelRequest): Promise<void> {
    this.queue = this.queue.then(() => this.show(req)).catch((e: unknown) => console.error("duel", e));
    return this.queue;
  }

  private async show(req: DuelRequest): Promise<void> {
    this.scene.bringToTop();
    const stage = new DuelStage(this, this.world, this.screen, this.matte, req);
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
