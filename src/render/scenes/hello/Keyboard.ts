import Phaser from "phaser";
import { COLOR, FONT } from "../../ui/fonts";
import { nine } from "../../ui/widgets/common";

export interface KeyPlate {
  id: string;
  label: string;
  /** Keyboard `code`s that light this plate. Mouse plates have none. */
  codes: string[];
  what: string;
  w?: number;
}

export interface KeyRow {
  plates: KeyPlate[];
}

const PLATE_H = 40;
const PLATE_W = 48;
const GAP = 8;
const ROW_GAP = 10;

interface PlateView {
  plate: KeyPlate;
  bg: Phaser.GameObjects.NineSlice;
  text: Phaser.GameObjects.Text;
}

/**
 * A drawn keyboard strip: rows of key plates (`ui-seg`). `light(id)` flashes a plate gold and
 * reports its description; hovering a plate reports it too.
 */
export class Keyboard extends Phaser.GameObjects.Container {
  private readonly views: PlateView[] = [];
  readonly height: number;

  constructor(scene: Phaser.Scene, x: number, y: number, rows: KeyRow[], private onShow: (plate: KeyPlate | null) => void) {
    super(scene, x, y);
    let top = 0;
    rows.forEach((row) => {
      let left = 0;
      row.plates.forEach((plate) => {
        const w = plate.w ?? PLATE_W;
        this.views.push(this.build(plate, left, top, w));
        left += w + GAP;
      });
      top += PLATE_H + ROW_GAP;
    });
    this.height = top - ROW_GAP;
    scene.add.existing(this);
  }

  private build(plate: KeyPlate, left: number, top: number, w: number): PlateView {
    const bg = nine(this.scene, "ui-seg", w, PLATE_H, "segment").setPosition(left, top);
    const text = this.scene.add.text(left + w / 2, top + PLATE_H / 2, plate.label, { fontFamily: FONT.display, fontSize: "14px", fontStyle: "600", color: COLOR.bone }).setOrigin(0.5, 0.5);
    this.add([bg, text]);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => this.onShow(plate));
    bg.on("pointerout", () => this.onShow(null));
    bg.on("pointerup", () => this.light(plate.id));
    return { plate, bg, text };
  }

  /** The plate for a keyboard event, if any. */
  plateFor(code: string): KeyPlate | null {
    return this.views.find((v) => v.plate.codes.includes(code))?.plate ?? null;
  }

  light(id: string): void {
    const v = this.views.find((x) => x.plate.id === id);
    if (!v) return;
    this.onShow(v.plate);
    v.bg.setTexture("ui-seg-on");
    v.text.setColor("#2a1d06");
    this.scene.tweens.killTweensOf(v.text);
    v.text.setScale(1.15);
    this.scene.tweens.add({ targets: v.text, scale: 1, duration: 160, ease: "Back.Out" });
    this.scene.time.delayedCall(420, () => {
      if (!v.bg.active) return;
      v.bg.setTexture("ui-seg");
      v.text.setColor(COLOR.bone);
    });
  }
}
