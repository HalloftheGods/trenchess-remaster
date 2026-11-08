import Phaser from "phaser";
import { COLOR, TEXT } from "../fonts";
import { hoverSfx, label, nine, pressSfx, type Choice } from "./common";

const SEG_H = 40;
const GAP = 4;

interface SegmentView {
  choice: Choice;
  bg: Phaser.GameObjects.NineSlice;
  text: Phaser.GameObjects.Text;
}

/** A row of mutually exclusive segments, with the selected choice's hint under the row. */
export class Segmented extends Phaser.GameObjects.Container {
  private readonly span: number;
  private readonly onChange: (id: string) => void;
  private readonly hint: Phaser.GameObjects.Text;
  private segments: SegmentView[] = [];
  private value: string;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, choices: Choice[], value: string, onChange: (id: string) => void) {
    super(scene, x, y);
    this.span = w;
    this.value = value;
    this.onChange = onChange;
    this.hint = label(scene, 2, SEG_H + 6, "", "small");
    this.add(this.hint);
    this.setSize(w, SEG_H + 26);
    scene.add.existing(this);
    this.setChoices(choices);
  }

  setChoices(choices: Choice[]): this {
    this.segments.forEach((s) => {
      s.bg.destroy();
      s.text.destroy();
    });
    const n = Math.max(choices.length, 1);
    const segW = (this.span - GAP * (n - 1)) / n;
    this.segments = choices.map((choice, i) => {
      const bg = nine(this.scene, "ui-seg", segW, SEG_H, "segment").setPosition(i * (segW + GAP), 0);
      const text = this.scene.add
        .text(bg.x + segW / 2, SEG_H / 2, choice.label, { ...TEXT.button, fontSize: "15px" })
        .setOrigin(0.5, 0.5);
      this.add([bg, text]);
      if (!choice.disabled) this.wire(bg, choice.id);
      return { choice, bg, text };
    });
    this.paint();
    return this;
  }

  private wire(bg: Phaser.GameObjects.NineSlice, id: string): void {
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => {
      if (id !== this.value) {
        hoverSfx();
        bg.setAlpha(0.85);
      }
    });
    bg.on("pointerout", () => bg.setAlpha(1));
    bg.on("pointerup", () => {
      if (id === this.value) return;
      pressSfx();
      this.setValue(id);
      this.onChange(id);
    });
  }

  private paint(): void {
    this.segments.forEach(({ choice, bg, text }) => {
      const on = choice.id === this.value;
      bg.setTexture(on ? "ui-seg-on" : "ui-seg");
      const color = on ? "#2a1d06" : COLOR.bone;
      text.setColor(color).setAlpha(choice.disabled ? 0.4 : 1);
    });
    const current = this.segments.find((s) => s.choice.id === this.value);
    this.hint.setText(current?.choice.hint ?? "");
  }

  setValue(id: string): this {
    this.value = id;
    this.paint();
    return this;
  }
}
