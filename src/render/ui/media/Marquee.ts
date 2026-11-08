import Phaser from "phaser";
import { TEXT } from "../fonts";

const SPEED = 28;
const REST_MS = 1400;

/**
 * One line of text clipped to a fixed width. When the text is wider than the box it glides
 * back and forth (resting at each end) so a long track title can still be read.
 */
export class Marquee extends Phaser.GameObjects.Container {
  private readonly text: Phaser.GameObjects.Text;
  private readonly span: number;
  private offset = 0;
  private dir = 1;
  private restUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, kind: keyof typeof TEXT = "h3") {
    super(scene, x, y);
    this.span = w;
    this.text = scene.add.text(0, 0, "", TEXT[kind]).setOrigin(0, 0);
    this.add(this.text);
    this.setSize(w, this.text.height);
    scene.add.existing(this);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.glide, this);
  }

  setText(s: string): this {
    if (s === this.text.text) return this;
    this.text.setText(s);
    this.offset = 0;
    this.dir = 1;
    this.restUntil = this.scene.time.now + REST_MS;
    this.clip();
    return this;
  }

  private get overflow(): number {
    return Math.max(0, this.text.width - this.span);
  }

  private clip(): void {
    this.text.setX(-this.offset);
    this.text.setCrop(this.offset, 0, this.span, this.text.height);
  }

  private glide(time: number, delta: number): void {
    const over = this.overflow;
    if (over === 0 || !this.visible || time < this.restUntil) return;
    this.offset += (this.dir * SPEED * delta) / 1000;
    if (this.offset >= over || this.offset <= 0) {
      this.offset = Phaser.Math.Clamp(this.offset, 0, over);
      this.dir = -this.dir as 1 | -1;
      this.restUntil = time + REST_MS;
    }
    this.clip();
  }

  destroy(fromScene?: boolean): void {
    this.scene?.events.off(Phaser.Scenes.Events.UPDATE, this.glide, this);
    super.destroy(fromScene);
  }
}
