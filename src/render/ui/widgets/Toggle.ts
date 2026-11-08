import Phaser from "phaser";
import { hitZone, hoverSfx, label, pressSfx } from "./common";

/** A check box with a label; the whole row is clickable. */
export class Toggle extends Phaser.GameObjects.Container {
  private readonly box: Phaser.GameObjects.Image;
  private value: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, labelText: string, value: boolean, onChange: (v: boolean) => void) {
    super(scene, x, y);
    this.value = value;
    this.box = scene.add.image(0, 0, value ? "ui-check-on" : "ui-check").setOrigin(0, 0);
    const text = label(scene, 38, 4, labelText, "body");
    const w = 38 + text.width;
    const zone = hitZone(scene, 0, 0, w, 28);
    this.add([this.box, text, zone]);
    this.setSize(w, 28);
    zone.on("pointerover", () => {
      hoverSfx();
      this.box.setTint(0xffe9a8);
    });
    zone.on("pointerout", () => this.box.clearTint());
    zone.on("pointerup", () => {
      pressSfx();
      this.setValue(!this.value);
      onChange(this.value);
    });
    scene.add.existing(this);
  }

  setValue(v: boolean): this {
    this.value = v;
    this.box.setTexture(v ? "ui-check-on" : "ui-check");
    return this;
  }
}
