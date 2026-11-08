import Phaser from "phaser";
import { COLOR, TEXT } from "../fonts";
import { hoverSfx, nine, pressSfx } from "../widgets/common";

/** A square on/off button showing one glyph, lit gold when on (shuffle, repeat...). */
export class IconToggle extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.NineSlice;
  private readonly glyph: Phaser.GameObjects.Text;
  private value: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, size: number, glyph: string, value: boolean, onChange: (v: boolean) => void) {
    super(scene, x, y);
    this.value = value;
    this.bg = nine(scene, "ui-seg", size, size, "segment");
    this.glyph = scene.add.text(size / 2, size / 2, glyph, { ...TEXT.button, fontSize: "17px" }).setOrigin(0.5, 0.5);
    this.add([this.bg, this.glyph]);
    this.setSize(size, size);
    this.paint();
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on("pointerover", () => {
      hoverSfx();
      this.bg.setTint(0xffe9a8);
    });
    this.bg.on("pointerout", () => this.bg.clearTint());
    this.bg.on("pointerup", () => {
      pressSfx();
      this.setValue(!this.value);
      onChange(this.value);
    });
    scene.add.existing(this);
  }

  private paint(): void {
    this.bg.setTexture(this.value ? "ui-seg-on" : "ui-seg");
    this.glyph.setColor(this.value ? "#2a1d06" : COLOR.dim);
  }

  setValue(v: boolean): this {
    this.value = v;
    this.paint();
    return this;
  }
}
