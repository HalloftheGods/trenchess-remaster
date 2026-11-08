import Phaser from "phaser";
import { COLOR, FONT, TEXT } from "../fonts";
import { hoverSfx, nine, pressSfx, type Choice } from "./common";

/** A choice with a big glyph for its card. */
export interface CardChoice extends Choice {
  glyph: string;
}

interface CardView {
  choice: CardChoice;
  bg: Phaser.GameObjects.NineSlice;
  parts: Phaser.GameObjects.Text[];
}

const GAP = 10;

/**
 * Big visual choice cards in a grid: a glyph and title on the first line, a short hint under them, the chosen one
 * on the brass plate. Positions by its top-left corner; `columns` cards per row.
 */
export class ChoiceCards extends Phaser.GameObjects.Container {
  private cards: CardView[] = [];
  private value: string;
  private readonly onChange: (id: string) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, choices: CardChoice[], value: string, columns: number, cardH: number, onChange: (id: string) => void) {
    super(scene, x, y);
    this.value = value;
    this.onChange = onChange;
    const cardW = (w - GAP * (columns - 1)) / columns;
    const rows = Math.ceil(choices.length / columns);
    const tight = columns >= 3;
    const glyphSize = tight ? "19px" : "22px";
    const titleSize = tight ? "14px" : "16px";
    choices.forEach((choice, i) => {
      const cx = (i % columns) * (cardW + GAP);
      const cy = Math.floor(i / columns) * (cardH + GAP);
      const bg = nine(scene, "ui-btn", cardW, cardH, "button").setPosition(cx, cy);
      const glyph = scene.add.text(cx + 14, cy + 11, choice.glyph, { fontFamily: FONT.display, fontSize: glyphSize, fontStyle: "800", color: COLOR.goldHex }).setOrigin(0, 0);
      const title = scene.add.text(cx + 14 + glyph.width + 8, cy + 14, choice.label, { ...TEXT.button, fontSize: titleSize }).setOrigin(0, 0);
      const hint = scene.add.text(cx + 14, cy + 42, choice.hint ?? "", { ...TEXT.small, wordWrap: { width: cardW - 28 } }).setOrigin(0, 0);
      this.add([bg, glyph, title, hint]);
      const view: CardView = { choice, bg, parts: [glyph, title, hint] };
      this.cards.push(view);
      if (!choice.disabled) this.wire(view);
    });
    this.setSize(w, rows * cardH + (rows - 1) * GAP);
    this.paint();
    scene.add.existing(this);
  }

  private wire(view: CardView): void {
    view.bg.setInteractive({ useHandCursor: true });
    view.bg.on("pointerover", () => {
      if (view.choice.id !== this.value) {
        hoverSfx();
        view.bg.setTexture("ui-btn-hover");
      }
    });
    view.bg.on("pointerout", () => this.paint());
    view.bg.on("pointerup", () => {
      if (view.choice.id === this.value) return;
      pressSfx();
      this.setValue(view.choice.id);
      this.onChange(view.choice.id);
    });
  }

  private paint(): void {
    this.cards.forEach(({ choice, bg, parts }) => {
      const on = choice.id === this.value;
      bg.setTexture(on ? "ui-btn-primary" : "ui-btn");
      const [glyph, title, hint] = parts;
      glyph.setColor(on ? "#2a1d06" : COLOR.goldHex);
      title.setColor(on ? "#2a1d06" : COLOR.bone);
      hint.setColor(on ? "#4a3a16" : COLOR.dim);
      parts.forEach((p) => p.setAlpha(choice.disabled ? 0.4 : 1));
    });
  }

  setValue(id: string): this {
    this.value = id;
    this.paint();
    return this;
  }
}
