import Phaser from "phaser";
import { paintUi } from "../ui/uiArt";
import { Compass, COMPASS_H } from "../ui/Compass";
import { MediaPlayer, PLAYER_H, PLAYER_W } from "../ui/MediaPlayer";
import { PANEL_W } from "./SetupScene";
import { motionMs } from "../ui/fonts";

const MARGIN = 20;
/** Bottom clearance of the player per screen: the title footer line, the battle HUD's action bar. */
const BOTTOM = { title: 44, setup: 44, battle: 84 };
/** Space the setup panel takes at the right edge (its own margin included). */
const SETUP_PANEL = PANEL_W + 24;

type Control = Phaser.GameObjects.Container;
type Dock = keyof typeof BOTTOM;

/**
 * Hosts the compass bottom-left during setup and battle (hidden under the splash and title) and
 * the media player, which appears once the splash is done and stays through the title, setup
 * and battle. The player docks bottom-right; in setup it moves left of the panel and in battle
 * it sits above the HUD bar. `setShown` drives the compass only; `setPlayerShown` the player.
 */
export class OverlayScene extends Phaser.Scene {
  private compass!: Compass;
  private player!: MediaPlayer;
  private controlsShown = false;
  private dock: Dock = "title";
  private slide: Phaser.Tweens.Tween | null = null;

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

  update(): void {
    const next = this.whereNow();
    if (next === this.dock) return;
    this.dock = next;
    const { x, y } = this.playerSpot();
    this.slide?.stop();
    this.slide = this.tweens.add({ targets: this.player, x, y, duration: motionMs(320), ease: "Cubic.easeOut" });
  }

  private whereNow(): Dock {
    if (!this.controlsShown) return "title";
    return this.scene.isActive("setup") ? "setup" : "battle";
  }

  private playerSpot(): { x: number; y: number } {
    const right = this.dock === "setup" ? SETUP_PANEL + MARGIN : MARGIN;
    return { x: this.scale.width - PLAYER_W - right, y: this.scale.height - PLAYER_H - BOTTOM[this.dock] };
  }

  private layout(): void {
    this.compass.setY(this.scale.height - COMPASS_H - MARGIN);
    const { x, y } = this.playerSpot();
    this.player.setPosition(x, y);
  }

  /** Fades the compass in or out; input is disabled while hidden. */
  setShown(on: boolean): void {
    if (!this.compass) return;
    this.controlsShown = on;
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
    this.tweens.getTweensOf(target).forEach((t) => t !== this.slide && t.stop());
    this.tweens.add({ targets: target, alpha: on ? 1 : 0, duration: 260, onComplete: () => target.setVisible(on) });
  }
}
