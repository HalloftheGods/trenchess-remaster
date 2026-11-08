import Phaser from "phaser";
import { paintUi } from "../ui/uiArt";
import { Compass, COMPASS_H } from "../ui/Compass";

const MARGIN = 20;

/** Hosts the compass bottom-left during setup and battle; hidden under the splash and title. */
export class OverlayScene extends Phaser.Scene {
  private compass!: Compass;

  constructor() {
    super("overlay");
  }

  create(): void {
    paintUi(this);
    this.compass = new Compass(this, MARGIN, 0).setAlpha(0).setVisible(false);
    this.layout();
    this.scale.on("resize", this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off("resize", this.layout, this));
  }

  private layout(): void {
    this.compass.setY(this.scale.height - COMPASS_H - MARGIN);
  }

  /** Fades the controls in or out; input is disabled while hidden. */
  setShown(on: boolean): void {
    if (!this.compass) return;
    this.compass.setVisible(true);
    this.tweens.killTweensOf(this.compass);
    this.tweens.add({ targets: this.compass, alpha: on ? 1 : 0, duration: 260, onComplete: () => this.compass.setVisible(on) });
  }
}
