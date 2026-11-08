import Phaser from "phaser";
import { sfx } from "../../../audio/sfx";
import { COLOR, TEXT, motionMs, reducedMotion } from "../fonts";
import { bindKeys, hitZone, hoverSfx, label, pressSfx, wrapIndex, type Choice } from "./common";

export interface MenuItem extends Choice {
  /** What the board should show while this item is selected. */
  preview?: string;
}

export const MENU_ROW = 60;
const MARKER_W = 28;
const TEXT_X = MARKER_W + 14;

interface RowView {
  item: MenuItem;
  title: Phaser.GameObjects.Text;
  hint: Phaser.GameObjects.Text;
}

const UP = new Set(["ArrowUp", "KeyW"]);
const DOWN = new Set(["ArrowDown", "KeyS"]);
const OPEN = new Set(["Enter", "NumpadEnter", "Space"]);

/**
 * A vertical menu: one item per row, an animated gold marker on the selected row.
 * Arrow keys / WASD move, Enter opens, pointer move selects, click opens.
 */
export class MenuList extends Phaser.GameObjects.Container {
  private readonly rows: RowView[];
  private readonly marker: Phaser.GameObjects.Image;
  private readonly onOpen: (id: string) => void;
  private readonly onSelect?: (id: string) => void;
  private readonly unbindKeys: () => void;
  private index = 0;
  private slide?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, items: MenuItem[], onOpen: (id: string) => void, onSelect?: (id: string) => void) {
    super(scene, x, y);
    this.onOpen = onOpen;
    this.onSelect = onSelect;
    this.rows = items.map((item, i) => this.buildRow(item, i));
    const w = Math.max(...this.rows.map((r) => TEXT_X + Math.max(r.title.width, r.hint.width))) + 8;
    this.marker = scene.add.image(MARKER_W / 2, MENU_ROW / 2 - 4, "ui-marker");
    this.add(this.marker);
    this.rows.forEach((_, i) => this.add(hitZone(scene, 0, i * MENU_ROW, w, MENU_ROW).on("pointermove", () => this.hoverRow(i)).on("pointerup", () => this.openRow(i))));
    this.setSize(w, items.length * MENU_ROW);
    this.unbindKeys = bindKeys(scene, (e) => this.onKey(e));
    this.bob();
    this.paint();
    scene.add.existing(this);
  }

  private buildRow(item: MenuItem, i: number): RowView {
    const top = i * MENU_ROW;
    const title = label(this.scene, TEXT_X, top, item.label, "h3").setFontSize(24);
    const hint = label(this.scene, TEXT_X, top + 31, item.hint ?? "", "small").setShadow(0, 1, "rgba(0,0,0,0.9)", 4, false, true);
    this.add([title, hint]);
    return { item, title, hint };
  }

  private bob(): void {
    if (reducedMotion()) return;
    this.scene.tweens.add({ targets: this.marker, x: MARKER_W / 2 + 5, duration: 520, yoyo: true, repeat: -1, ease: "Sine.InOut" });
  }

  private hoverRow(i: number): void {
    if (i === this.index) return;
    hoverSfx();
    this.select(i);
  }

  private openRow(i: number): void {
    this.select(i);
    this.open();
  }

  private onKey(e: KeyboardEvent): void {
    if (UP.has(e.code)) this.move(-1);
    else if (DOWN.has(e.code)) this.move(1);
    else if (OPEN.has(e.code)) this.open();
  }

  private move(dir: number): void {
    hoverSfx();
    this.select(this.index + dir);
  }

  private open(): void {
    const row = this.rows[this.index];
    if (!row) return;
    if (row.item.disabled) {
      sfx.error();
      this.shake(row.title);
      return;
    }
    pressSfx();
    this.onOpen(row.item.id);
  }

  private shake(target: Phaser.GameObjects.Text): void {
    const x0 = target.x;
    this.scene.tweens.add({ targets: target, x: x0 + 6, duration: motionMs(40), yoyo: true, repeat: 3, onComplete: () => target.setX(x0) });
  }

  private paint(): void {
    this.rows.forEach((row, i) => {
      const on = i === this.index;
      const dim = row.item.disabled ? 0.38 : 1;
      row.title.setColor(on ? COLOR.goldHex : COLOR.bone).setAlpha(dim);
      row.hint.setColor(on ? COLOR.bone : COLOR.dim).setAlpha(dim * (on ? 1 : 0.8));
      row.title.setShadow(0, on ? 0 : 2, on ? "rgba(242,201,76,0.7)" : "rgba(0,0,0,0.9)", on ? 12 : 4, false, true);
      row.title.setFontStyle(on ? "800" : TEXT.h3.fontStyle ?? "600");
    });
  }

  select(i: number): void {
    const next = wrapIndex(i, this.rows.length);
    const changed = next !== this.index;
    this.index = next;
    this.paint();
    this.slide?.stop();
    this.slide = this.scene.tweens.add({ targets: this.marker, y: next * MENU_ROW + MENU_ROW / 2 - 4, duration: motionMs(160), ease: "Back.Out" });
    if (changed) this.onSelect?.(this.rows[next].item.id);
  }

  get selected(): number {
    return this.index;
  }

  /** The row objects, in order, so a scene can animate them in. */
  get rowObjects(): Phaser.GameObjects.GameObject[][] {
    return this.rows.map((r) => [r.title, r.hint]);
  }

  destroy(fromScene?: boolean): void {
    this.unbindKeys();
    super.destroy(fromScene);
  }
}
