import Phaser from "phaser";
import { boardBounds, getProjection } from "../iso";
import { PEAKS_H } from "../art/skyArt";
import { PLINTH_ISO, PLINTH_MARGIN, PLINTH_TOP, type PlinthSpec } from "../art/plinthArt";
import { backdrop, type BackdropMode } from "./backdropMode";

interface Look {
  dome: boolean;
  stars: boolean;
  peaks: boolean;
  haze: number;
}

const LOOKS: Record<BackdropMode, Look> = {
  dusk: { dome: true, stars: true, peaks: false, haze: 0.08 },
  peaks: { dome: true, stars: true, peaks: true, haze: 0.14 },
  stars: { dome: false, stars: true, peaks: false, haze: 0 },
  void: { dome: false, stars: false, peaks: false, haze: 0 },
};

/** Everything behind the tiles: sky dome, drifting stars, distant peaks, the ground and the stone plinth. */
export class Backdrop {
  private dome: Phaser.GameObjects.Image;
  private ground: Phaser.GameObjects.Graphics;
  private stars: Phaser.GameObjects.TileSprite;
  private peaks: Phaser.GameObjects.Image;
  private haze: Phaser.GameObjects.Image;
  private plinthIso: Phaser.GameObjects.Image;
  private plinthTop: Phaser.GameObjects.Image;

  constructor(private scene: Phaser.Scene) {
    this.dome = scene.add.image(0, 0, "sky-dome").setOrigin(0.5, 0.97).setScale(6).setDepth(-100);
    this.ground = scene.add.graphics().setDepth(-99);
    this.ground.fillGradientStyle(0x2a2126, 0x2a2126, 0x05060a, 0x05060a, 1);
    this.ground.fillRect(-3000, 0, 6000, 2600);
    this.stars = scene.add.tileSprite(0, 0, 4200, 4200, "sky-stars").setBlendMode("ADD").setAlpha(0.5).setDepth(-98);
    this.peaks = scene.add.image(0, 0, "sky-peaks").setOrigin(0.5, 1).setScale(1.4).setDepth(-97);
    this.haze = scene.add.image(0, 0, "glow").setBlendMode("ADD").setTint(0xf0b070).setScale(48, 1.3).setAlpha(0.08).setDepth(-96);
    this.plinthIso = this.plinth(PLINTH_ISO);
    this.plinthTop = this.plinth(PLINTH_TOP);
    this.relayout(0);
    this.setMode(backdrop.mode, 0);
  }

  /** Switches what shows behind the board; `duration` fades the change. */
  setMode(mode: BackdropMode, duration = 400): void {
    backdrop.mode = mode;
    const look = LOOKS[mode];
    const top = getProjection() === "top";
    const show = (obj: Phaser.GameObjects.Components.AlphaSingle & Phaser.GameObjects.Components.Visible, alpha: number) => {
      if (duration > 0) this.scene.tweens.add({ targets: obj, alpha, duration, ease: "Sine.InOut", onComplete: () => obj.setVisible(alpha > 0) });
      else obj.setAlpha(alpha).setVisible(alpha > 0);
      if (alpha > 0) obj.setVisible(true);
    };
    show(this.dome, look.dome ? 1 : 0);
    show(this.ground, look.dome ? 1 : 0);
    show(this.stars, look.stars ? 0.5 : 0);
    show(this.peaks, look.peaks && !top ? 1 : 0);
    show(this.haze, look.haze);
  }

  private plinth(spec: PlinthSpec): Phaser.GameObjects.Image {
    return this.scene.add.image(0, 0, spec.key).setOrigin(spec.anchorX / spec.width, spec.anchorY / spec.height).setDepth(-10);
  }

  /** Place the backdrop for the current projection: the horizon sits just behind the plinth's back edge. */
  relayout(duration: number): void {
    const b = boardBounds();
    const top = getProjection() === "top";
    const backEdge = b.centerY - b.height / 2 - PLINTH_MARGIN;
    const horizon = backEdge - (top ? 140 : 30);
    const targets: [Phaser.GameObjects.Components.Transform, number, number][] = [
      [this.dome, b.centerX, horizon],
      [this.ground, b.centerX, horizon],
      [this.stars, b.centerX, horizon - 600],
      [this.peaks, b.centerX, horizon + PEAKS_H * 0.12],
      [this.haze, b.centerX, horizon],
      [this.plinthIso, b.centerX, b.centerY],
      [this.plinthTop, b.centerX, b.centerY],
    ];
    for (const [obj, x, y] of targets) {
      if (duration > 0) this.scene.tweens.add({ targets: obj, x, y, duration, ease: "Cubic.InOut" });
      else obj.setPosition(x, y);
    }
    const fade = (img: Phaser.GameObjects.Image, on: boolean) => {
      if (duration > 0) this.scene.tweens.add({ targets: img, alpha: on ? 1 : 0, duration, ease: "Sine.InOut" });
      else img.setAlpha(on ? 1 : 0);
    };
    fade(this.plinthIso, !top);
    fade(this.plinthTop, top);
    fade(this.peaks, !top && LOOKS[backdrop.mode].peaks);
  }

  /** Slow star drift; no allocations. */
  update(dt: number): void {
    this.stars.angle += dt * 0.0006;
  }
}
