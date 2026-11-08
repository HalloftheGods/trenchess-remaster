import Phaser from "phaser";
import { boardBounds, getProjection } from "../iso";
import { PEAKS_H, skyKey } from "../art/skyArt";
import { PLINTH_ISO, PLINTH_MARGIN, PLINTH_TOP, plinthKey, type PlinthSpec } from "../art/plinthArt";
import { recipe } from "../art/worlds/registry";

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
    this.dome = scene.add.image(0, 0, skyKey("dome")).setOrigin(0.5, 0.97).setScale(6).setDepth(-100);
    this.ground = scene.add.graphics().setDepth(-99);
    this.stars = scene.add.tileSprite(0, 0, 4200, 4200, skyKey("stars")).setBlendMode("ADD").setAlpha(0.5).setDepth(-98);
    this.peaks = scene.add.image(0, 0, skyKey("peaks")).setOrigin(0.5, 1).setScale(1.4).setDepth(-97);
    this.haze = scene.add.image(0, 0, "glow").setBlendMode("ADD").setScale(48, 1.3).setAlpha(0.22).setDepth(-96);
    this.plinthIso = this.plinth(PLINTH_ISO);
    this.plinthTop = this.plinth(PLINTH_TOP);
    this.retexture();
    this.relayout(0);
  }

  private plinth(spec: PlinthSpec): Phaser.GameObjects.Image {
    return this.scene.add.image(0, 0, plinthKey(spec)).setOrigin(spec.anchorX / spec.width, spec.anchorY / spec.height).setDepth(-10);
  }

  /** Re-read every world-keyed texture and colour after `applyWorld` + the paint calls. */
  retexture(): void {
    const sky = recipe().sky;
    this.dome.setTexture(skyKey("dome"));
    this.stars.setTexture(skyKey("stars"));
    this.peaks.setTexture(skyKey("peaks"));
    this.plinthIso.setTexture(plinthKey(PLINTH_ISO));
    this.plinthTop.setTexture(plinthKey(PLINTH_TOP));
    this.haze.setTint(sky.glow);
    this.ground.clear();
    this.ground.fillGradientStyle(sky.ground[0], sky.ground[0], sky.ground[1], sky.ground[1], 1);
    this.ground.fillRect(-3000, 0, 6000, 2600);
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
    fade(this.peaks, !top);
  }

  /** Slow star drift; no allocations. */
  update(dt: number): void {
    this.stars.angle += dt * 0.0006;
  }
}
