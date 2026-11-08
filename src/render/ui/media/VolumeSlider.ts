import Phaser from "phaser";
import { COLOR } from "../fonts";
import { hitZone, hoverSfx, pressSfx } from "../widgets/common";

const H = 28;
const TRACK_H = 8;
const KNOB = 28;
const WHEEL_STEP = 0.05;

/**
 * A horizontal 0..1 slider on the kit's `ui-track` with a gold `ui-knob`. Click anywhere on the
 * track to jump, drag the knob, or scroll the wheel over it. Top-left anchored, 28 px tall.
 */
export class VolumeSlider extends Phaser.GameObjects.Container {
  private readonly span: number;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly knob: Phaser.GameObjects.Image;
  private readonly onChange: (v: number) => void;
  private value: number;
  private dragging = false;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, value: number, onChange: (v: number) => void) {
    super(scene, x, y);
    this.span = w;
    this.value = value;
    this.onChange = onChange;
    const track = scene.add.nineslice(0, (H - TRACK_H) / 2, "ui-track", undefined, w, TRACK_H, 3, 3, 3, 3).setOrigin(0, 0);
    this.fill = scene.add.rectangle(2, H / 2, 0, TRACK_H - 4, COLOR.gold, 0.7).setOrigin(0, 0.5);
    this.knob = scene.add.image(0, H / 2, "ui-knob").setOrigin(0.5, 0.5);
    const zone = hitZone(scene, -KNOB / 2, 0, w + KNOB, H);
    this.add([track, this.fill, this.knob, zone]);
    this.setSize(w, H);
    this.place();
    this.wire(zone);
    scene.add.existing(this);
  }

  private wire(zone: Phaser.GameObjects.Zone): void {
    zone.on("pointerover", () => {
      hoverSfx();
      this.knob.setTint(0xffe9a8);
    });
    zone.on("pointerout", () => this.knob.clearTint());
    zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      pressSfx();
      this.fromPointer(p);
    });
    zone.on("wheel", (_p: Phaser.Input.Pointer, _dx: number, dy: number) => this.commit(this.value - Math.sign(dy) * WHEEL_STEP));
    this.scene.input.on("pointermove", this.onMove, this);
    this.scene.input.on("pointerup", this.onUp, this);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (this.dragging) this.fromPointer(p);
  }

  private onUp(): void {
    this.dragging = false;
  }

  private fromPointer(p: Phaser.Input.Pointer): void {
    const local = this.getWorldTransformMatrix().applyInverse(p.x, p.y);
    this.commit(local.x / this.span);
  }

  private commit(v: number): void {
    const next = Phaser.Math.Clamp(v, 0, 1);
    if (next === this.value) return;
    this.value = next;
    this.place();
    this.onChange(next);
  }

  private place(): void {
    this.knob.setX(this.value * this.span);
    this.fill.width = Math.max(0, this.value * this.span - 2);
  }

  setValue(v: number): this {
    this.value = Phaser.Math.Clamp(v, 0, 1);
    this.place();
    return this;
  }

  destroy(fromScene?: boolean): void {
    this.scene?.input.off("pointermove", this.onMove, this);
    this.scene?.input.off("pointerup", this.onUp, this);
    super.destroy(fromScene);
  }
}
