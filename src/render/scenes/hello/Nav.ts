import Phaser from "phaser";
import { Button } from "../../ui/widgets";
import { hoverSfx, pressSfx } from "../../ui/widgets/common";
import { INK, INNER, NAV_Y, PAD, PAGE_TEXT, PANEL_H } from "./pageKit";

export interface NavActions {
  back: () => void;
  contents: () => void;
  prev: () => void;
  next: () => void;
  go: (index: number) => void;
}

const DOT_X = 20;
const DOT_STEP = 22;

/**
 * The tome's navigation: Back · Contents · page label · Prev · Next along the bottom, and one
 * chapter dot per page down the left edge (click to jump).
 */
export class Nav extends Phaser.GameObjects.Container {
  private readonly label: Phaser.GameObjects.Text;
  private readonly prevBtn: Button;
  private readonly nextBtn: Button;
  private readonly dots: Phaser.GameObjects.Image[];

  constructor(scene: Phaser.Scene, pages: number, actions: NavActions) {
    super(scene, 0, 0);
    const small = { small: true };
    const back = new Button(scene, PAD, NAV_Y, "‹ Back", actions.back, { ...small, w: 76 });
    const contents = new Button(scene, PAD + 82, NAV_Y, "Contents", actions.contents, { ...small, w: 96 });
    this.prevBtn = new Button(scene, PAD + INNER - 140, NAV_Y, "‹ Prev", actions.prev, { ...small, w: 66 });
    this.nextBtn = new Button(scene, PAD + INNER - 66, NAV_Y, "Next ›", actions.next, { ...small, w: 66 });
    this.label = scene.add.text(PAD + 178 + (INNER - 140 - 178) / 2, NAV_Y + 18, "", { ...PAGE_TEXT.small, fontSize: "14px", color: INK.soft }).setOrigin(0.5, 0.5);
    this.dots = Array.from({ length: pages }, (_, i) => this.dot(i, pages, actions.go));
    this.add([back, contents, this.prevBtn, this.nextBtn, this.label, ...this.dots]);
    scene.add.existing(this);
  }

  private dot(i: number, pages: number, go: (index: number) => void): Phaser.GameObjects.Image {
    const top = PANEL_H / 2 - ((pages - 1) * DOT_STEP) / 2;
    const d = this.scene.add.image(DOT_X, top + i * DOT_STEP, "ui-dot").setInteractive({ useHandCursor: true });
    d.on("pointerover", () => {
      hoverSfx();
      d.setScale(1.3);
    });
    d.on("pointerout", () => d.setScale(1));
    d.on("pointerup", () => {
      pressSfx();
      go(i);
    });
    return d;
  }

  setPage(index: number, pages: number): void {
    this.label.setText(`${index + 1} / ${pages}`);
    this.prevBtn.setEnabled(index > 0);
    this.nextBtn.setEnabled(index < pages - 1);
    this.dots.forEach((d, i) => d.setTexture(i === index ? "ui-dot-on" : "ui-dot"));
  }
}
