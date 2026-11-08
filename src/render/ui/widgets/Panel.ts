import Phaser from "phaser";
import { nine } from "./common";

export type PanelVariant = "steel" | "parchment";

const TEXTURE: Record<PanelVariant, string> = { steel: "ui-panel", parchment: "ui-panel-parchment" };

/** A nine-sliced plate; positions by its top-left corner. */
export class Panel extends Phaser.GameObjects.Container {
  private readonly plate: Phaser.GameObjects.NineSlice;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, variant: PanelVariant = "steel") {
    super(scene, x, y);
    this.plate = nine(scene, TEXTURE[variant], w, h, "panel");
    this.add(this.plate);
    this.setSize(w, h);
    scene.add.existing(this);
  }

  resize(w: number, h: number): void {
    this.plate.setSize(w, h);
    this.setSize(w, h);
  }
}
