import Phaser from "phaser";
import { paintUi } from "../ui/uiArt";
import { Compass, COMPASS_H } from "../ui/Compass";
import { MediaPlayer, PLAYER_H, PLAYER_W } from "../ui/MediaPlayer";

const MARGIN = 20;

type Control = Phaser.GameObjects.Container;

/**
 * Hosts the compass bottom-left during setup and battle (hidden under the splash and title) and
 * the media player bottom-right, which appears once the splash is done and stays through the
 * title, setup and battle. `setShown` drives the compass only; `setPlayerShown` the player.
 */
export class OverlayScene extends Phaser.Scene {
  private compass!: Compass;
  private player!: MediaPlayer;

  constructor() {
    super("overlay");
  }

  create(): void {
    paintUi(this);
    this.compass = new Compass(this, MARGIN, 0).setAlpha(0).setVisible(false);
    this.player = new MediaPlayer(this, 0, 0).setAlpha(0).setVisible(false);
    this.layout();
    this.scale.on("resize", this.layout, this);
    const reveal = (): void => this.setPlayerShown(true);
    this.game.events.on("ui:splash-done", reveal);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.layout, this);
      this.game.events.off("ui:splash-done", reveal);
    });
  }

  private layout(): void {
    this.compass.setY(this.scale.height - COMPASS_H - MARGIN);
    this.player.setPosition(this.scale.width - PLAYER_W - MARGIN, this.scale.height - PLAYER_H - MARGIN);
  }

  /** Fades the compass in or out; input is disabled while hidden. */
  setShown(on: boolean): void {
    if (!this.compass) return;
    this.fade(this.compass, on);
  }

  /** Fades the media player in or out (it is shown automatically after the splash). */
  setPlayerShown(on: boolean): void {
    if (!this.player) return;
    this.fade(this.player, on);
  }

  /** The media player, for the flow to collapse or expand it. */
  get mediaPlayer(): MediaPlayer {
    return this.player;
  }

  private fade(target: Control, on: boolean): void {
    target.setVisible(true);
    this.tweens.killTweensOf(target);
    this.tweens.add({ targets: target, alpha: on ? 1 : 0, duration: 260, onComplete: () => target.setVisible(on) });
  }
}
