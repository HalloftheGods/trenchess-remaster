import Phaser from "phaser";
import { motionMs } from "../fonts";
import { bindKeys, hitZone, hoverSfx, label, pressSfx, wrapIndex, type Choice } from "./common";

const H = 72;
const CHEVRON = 28;
const DOT_STEP = 16;
const SWIPE = 30;

/**
 * A horizontal picker: chevrons left/right, label + hint, dots under them.
 * Drag or swipe on the label area, wheel, and left/right keys while the pointer is over it.
 */
export class Carousel extends Phaser.GameObjects.Container {
  private readonly span: number;
  private readonly onChange: (index: number) => void;
  private readonly title: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly unbindKeys: () => void;
  private dots: Phaser.GameObjects.Image[] = [];
  private items: Choice[];
  private index: number;
  private focused = false;
  private dragStart: number | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, items: Choice[], index: number, onChange: (index: number) => void) {
    super(scene, x, y);
    this.span = w;
    this.items = items;
    this.index = index;
    this.onChange = onChange;
    const left = scene.add.image(CHEVRON / 2, H / 2 - 8, "ui-chevron").setFlipX(true);
    const right = scene.add.image(w - CHEVRON / 2, H / 2 - 8, "ui-chevron");
    this.title = label(scene, w / 2, 8, "", "h3").setOrigin(0.5, 0);
    this.hint = label(scene, w / 2, 34, "", "small").setOrigin(0.5, 0);
    this.zone = hitZone(scene, CHEVRON + 4, 0, w - CHEVRON * 2 - 8, H - 16);
    this.add([left, right, this.title, this.hint, this.zone]);
    this.setSize(w, H);
    this.wireChevron(left, -1);
    this.wireChevron(right, 1);
    this.wireZone();
    this.unbindKeys = bindKeys(scene, (e) => this.onKey(e));
    scene.add.existing(this);
    this.setItems(items);
  }

  private wireChevron(img: Phaser.GameObjects.Image, dir: 1 | -1): void {
    img.setInteractive({ useHandCursor: true });
    img.on("pointerover", () => {
      hoverSfx();
      img.setScale(1.15);
    });
    img.on("pointerout", () => img.setScale(1));
    img.on("pointerup", () => this.step(dir));
  }

  private wireZone(): void {
    this.zone.on("pointerover", () => {
      this.focused = true;
    });
    this.zone.on("pointerout", () => {
      this.focused = false;
      this.dragStart = null;
    });
    this.zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.dragStart = p.x;
    });
    this.zone.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.dragStart === null) return;
      const dx = p.x - this.dragStart;
      this.dragStart = null;
      if (Math.abs(dx) >= SWIPE) this.step(dx < 0 ? 1 : -1);
    });
    this.zone.on("wheel", (_p: Phaser.Input.Pointer, _dx: number, dy: number) => this.step(dy > 0 ? 1 : -1));
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.focused) return;
    if (e.code === "ArrowLeft") this.step(-1);
    if (e.code === "ArrowRight") this.step(1);
  }

  private step(dir: 1 | -1): void {
    if (this.items.length < 2) return;
    pressSfx();
    this.setIndex(this.index + dir, true);
    this.onChange(this.index);
  }

  setItems(items: Choice[]): this {
    this.items = items;
    this.dots.forEach((d) => d.destroy());
    const startX = this.span / 2 - ((items.length - 1) * DOT_STEP) / 2;
    this.dots = items.map((_, i) => this.scene.add.image(startX + i * DOT_STEP, H - 8, "ui-dot"));
    this.add(this.dots);
    this.setIndex(this.index, false);
    return this;
  }

  setIndex(i: number, animate = false): this {
    const n = Math.max(this.items.length, 1);
    const dir = Math.sign(wrapIndex(i, n) - this.index) || 1;
    this.index = wrapIndex(i, n);
    const item = this.items[this.index];
    this.dots.forEach((d, k) => d.setTexture(k === this.index ? "ui-dot-on" : "ui-dot"));
    const apply = () => {
      this.title.setText(item?.label ?? "");
      this.hint.setText(item?.hint ?? "");
    };
    if (!animate) {
      apply();
      return this;
    }
    const targets = [this.title, this.hint];
    this.scene.tweens.killTweensOf(targets);
    this.scene.tweens.add({
      targets,
      x: this.span / 2 - 14 * dir,
      alpha: 0,
      duration: motionMs(90),
      onComplete: () => {
        apply();
        targets.forEach((t) => t.setX(this.span / 2 + 14 * dir));
        this.scene.tweens.add({ targets, x: this.span / 2, alpha: 1, duration: motionMs(140), ease: "Cubic.Out" });
      },
    });
    return this;
  }

  destroy(fromScene?: boolean): void {
    this.unbindKeys();
    super.destroy(fromScene);
  }
}
