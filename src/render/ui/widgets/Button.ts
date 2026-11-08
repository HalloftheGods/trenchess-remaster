import Phaser from "phaser";
import { COLOR, TEXT } from "../fonts";
import { hoverSfx, nine, pressSfx } from "./common";

export interface ButtonOptions {
  w?: number;
  h?: number;
  primary?: boolean;
  /** Texture key of an icon drawn left of the label. */
  icon?: string;
  small?: boolean;
}

type State = "idle" | "hover" | "down";

/** A nine-sliced push button; positions by its top-left corner. */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.NineSlice;
  private readonly text: Phaser.GameObjects.Text;
  private readonly icon?: Phaser.GameObjects.Image;
  private readonly primary: boolean;
  private enabled = true;
  private look: State = "idle";

  constructor(scene: Phaser.Scene, x: number, y: number, labelText: string, onPress: () => void, opts: ButtonOptions = {}) {
    super(scene, x, y);
    this.primary = opts.primary ?? false;
    const h = opts.h ?? (opts.small ? 36 : 48);
    const size = opts.small ? "15px" : TEXT.button.fontSize;
    this.text = scene.add.text(0, 0, labelText, { ...TEXT.button, fontSize: size }).setOrigin(0.5, 0.5);
    if (opts.icon) this.icon = scene.add.image(0, 0, opts.icon).setOrigin(0.5, 0.5);
    const iconW = this.icon ? this.icon.displayWidth + 8 : 0;
    const w = opts.w ?? Math.max(this.text.width + iconW + 40, opts.small ? 80 : 120);
    this.bg = nine(scene, "ui-btn", w, h, "button");
    this.add(this.bg);
    if (this.icon) this.add(this.icon);
    this.add(this.text);
    this.setSize(w, h);
    this.layout();
    this.paint();
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on("pointerover", () => this.setLook("hover", true));
    this.bg.on("pointerout", () => this.setLook("idle", false));
    this.bg.on("pointerdown", () => this.setLook("down", false));
    this.bg.on("pointerup", () => {
      if (!this.enabled || this.look !== "down") return;
      this.setLook("hover", false);
      pressSfx();
      onPress();
    });
    scene.add.existing(this);
  }

  private layout(): void {
    const w = this.width;
    const h = this.height;
    const iconW = this.icon ? this.icon.displayWidth + 8 : 0;
    const total = this.text.width + iconW;
    const left = (w - total) / 2;
    if (this.icon) this.icon.setPosition(left + this.icon.displayWidth / 2, h / 2);
    this.text.setPosition(left + iconW + this.text.width / 2, h / 2);
  }

  private setLook(look: State, sound: boolean): void {
    if (!this.enabled) return;
    if (sound && look !== this.look) hoverSfx();
    this.look = look;
    this.paint();
  }

  private paint(): void {
    if (!this.enabled) {
      this.bg.setTexture("ui-btn-disabled");
      this.text.setColor(COLOR.dim).setAlpha(0.7);
      return;
    }
    const base = this.primary ? "ui-btn-primary" : "ui-btn";
    const byState: Record<State, string> = {
      idle: base,
      hover: `${base}-hover`,
      down: this.primary ? "ui-btn-primary" : "ui-btn-down",
    };
    this.bg.setTexture(byState[this.look]);
    this.text.setColor(this.primary ? "#2a1d06" : COLOR.bone).setAlpha(1);
    const lift = this.look === "down" ? 1 : 0;
    this.text.setY(this.height / 2 + lift);
    this.setScale(this.look === "down" ? 0.985 : 1);
  }

  setEnabled(on: boolean): this {
    this.enabled = on;
    this.look = "idle";
    this.paint();
    if (on) this.bg.setInteractive({ useHandCursor: true });
    else this.bg.disableInteractive();
    return this;
  }

  setLabel(s: string): this {
    this.text.setText(s);
    this.layout();
    return this;
  }
}
