import Phaser from "phaser";
import type { Terrain, Unit } from "../../engine/types";
import { TERRAIN_LORE, UNIT_LORE } from "../../game/lore";
import { FACTIONS } from "../art/unitArt";
import { SCREEN_H } from "./pixel/painter";
import { mix } from "./pixel/palette";
import { textKey, textWidth } from "./pixel/textures";

/** Height of the upper bar and top of the lower panel, in duel pixels. */
export const TOP_BAR = 20;
export const PANEL_Y = 150;
/** Widest a name plate grows on wide windows; both plates sit either side of the centre. */
const PLATE_MAX = 150;

const INK = 0x0b0a14;
const GOLD = "#f2c94c";
const BONE = "#e9e2cf";
const hex = (css: string): number => Phaser.Display.Color.HexStringToColor(css).color;

interface Plate {
  root: Phaser.GameObjects.Container;
  fill: Phaser.GameObjects.Rectangle;
  ghost: Phaser.GameObjects.Rectangle;
  barW: number;
  x: number;
}

/**
 * The duel's pixel HUD, drawn in the low-res world so it shares the pixel grid: the upper bar
 * (location caption, ability name, outcome), the lower panel with each side's name plate and
 * health bar in the GBA style, the screen flash and speed lines.
 */
export class DuelHud {
  private readonly plates: [Plate, Plate];
  private readonly flashRect: Phaser.GameObjects.Rectangle;
  private readonly streaks: Phaser.GameObjects.TileSprite;
  private readonly transient: Phaser.GameObjects.GameObject[] = [];
  private streakDir = 1;

  constructor(private scene: Phaser.Scene, private ui: Phaser.GameObjects.Container, private w: number, left: Unit, right: Unit) {
    this.streaks = scene.add.tileSprite(0, TOP_BAR, w, PANEL_Y - TOP_BAR, "px-streak").setOrigin(0, 0).setAlpha(0);
    this.flashRect = scene.add.rectangle(0, 0, w, SCREEN_H, 0xffffff).setOrigin(0, 0).setAlpha(0);
    const top = scene.add.rectangle(0, 0, w, TOP_BAR, INK).setOrigin(0, 0);
    const topLine = scene.add.rectangle(0, TOP_BAR - 1, w, 1, hex(GOLD)).setOrigin(0, 0);
    const panel = scene.add.rectangle(0, PANEL_Y, w, SCREEN_H - PANEL_Y, INK).setOrigin(0, 0);
    const panelLine = scene.add.rectangle(0, PANEL_Y, w, 1, hex(GOLD)).setOrigin(0, 0);
    ui.add([this.streaks, this.flashRect, top, topLine, panel, panelLine]);
    this.plates = [this.plate(left, 0), this.plate(right, 1)];
  }

  private plate(unit: Unit, side: 0 | 1): Plate {
    const s = this.scene;
    const f = FACTIONS[unit.owner];
    const pw = Math.min(PLATE_MAX, Math.floor(this.w / 2) - 6);
    const ph = SCREEN_H - PANEL_Y - 5;
    const x = side === 0 ? Math.floor(this.w / 2) - 2 - pw : Math.ceil(this.w / 2) + 2;
    const root = s.add.container(x, PANEL_Y + 3);
    const edge = s.add.rectangle(0, 0, pw, ph, hex("#140c1c")).setOrigin(0, 0);
    const body = s.add.rectangle(1, 1, pw - 2, ph - 2, hex(mix(f.dark, "#0b0a14", 0.45))).setOrigin(0, 0);
    const shine = s.add.rectangle(1, 1, pw - 2, 1, hex(mix(f.base, "#ffffff", 0.2))).setOrigin(0, 0);
    const stripe = s.add.rectangle(side === 0 ? 1 : pw - 3, 1, 2, ph - 2, hex(f.base)).setOrigin(0, 0);
    const title = UNIT_LORE[unit.type].title;
    const tx = side === 0 ? 6 : pw - 6 - textWidth(title);
    const name = s.add.image(tx, 3, textKey(s, title, BONE)).setOrigin(0, 0);
    const hp = s.add.image(side === 0 ? 6 : pw - 6 - textWidth("HP"), ph - 4, textKey(s, "HP", GOLD)).setOrigin(0, 1);
    const barW = pw - 12 - textWidth("HP") - 4;
    const bx = side === 0 ? 6 + textWidth("HP") + 3 : 6;
    const frame = s.add.rectangle(bx - 1, ph - 9, barW + 2, 5, hex("#140c1c")).setOrigin(0, 0);
    const back = s.add.rectangle(bx, ph - 8, barW, 3, hex("#3a3448")).setOrigin(0, 0);
    const ghost = s.add.rectangle(bx, ph - 8, barW, 3, 0xffffff).setOrigin(0, 0);
    const fill = s.add.rectangle(bx, ph - 8, barW, 3, hex(f.light)).setOrigin(0, 0);
    const fillShade = s.add.rectangle(bx, ph - 6, barW, 1, hex(f.base)).setOrigin(0, 0);
    fill.setData("shade", fillShade);
    root.add([edge, body, shine, stripe, name, hp, frame, back, ghost, fill, fillShade]);
    root.setAlpha(0);
    this.ui.add(root);
    return { root, fill, ghost, barW, x };
  }

  showPlates(ms: number): void {
    this.plates.forEach((p, i) => {
      p.root.setAlpha(1).setY(SCREEN_H);
      this.scene.tweens.add({ targets: p.root, y: PANEL_Y + 3, duration: ms, delay: i * ms * 0.3, ease: "Cubic.Out" });
    });
  }

  platesNow(): void {
    this.plates.forEach((p) => {
      this.scene.tweens.killTweensOf(p.root);
      p.root.setAlpha(1).setPosition(p.x, PANEL_Y + 3);
    });
  }

  private setFill(p: Plate, frac: number): void {
    const k = Math.max(0, Math.round(p.barW * frac)) / p.barW;
    p.fill.setScale(k, 1);
    (p.fill.getData("shade") as Phaser.GameObjects.Rectangle).setScale(k, 1);
  }

  /** Drains side `i`'s bar to `frac` at once; the white ghost bar ticks down after it. */
  damage(i: 0 | 1, frac: number, ms: number): void {
    const p = this.plates[i];
    this.setFill(p, frac);
    this.scene.tweens.killTweensOf(p.ghost);
    this.scene.tweens.add({ targets: p.ghost, scaleX: Math.max(0, frac), delay: ms * 0.35, duration: ms, ease: "Stepped", easeParams: [8] });
    this.scene.tweens.add({ targets: p.root, x: p.x + 1, duration: 30, yoyo: true, repeat: 3, onComplete: () => p.root.setX(p.x) });
  }

  hpNow(i: 0 | 1, frac: number): void {
    const p = this.plates[i];
    this.scene.tweens.killTweensOf(p.ghost);
    this.setFill(p, frac);
    p.ghost.setScale(frac, 1);
  }

  fallen(i: 0 | 1): void {
    this.scene.tweens.add({ targets: this.plates[i].root, alpha: 0.45, duration: 300, ease: "Stepped", easeParams: [3] });
  }

  private banner(key: string, y: number, holdMs: number, from: number): Phaser.GameObjects.Image {
    const img = this.scene.add.image(Math.round(this.w / 2), y, key).setOrigin(0.5, 0);
    img.x = Math.round(this.w / 2 + from);
    this.ui.add(img);
    this.transient.push(img);
    this.scene.tweens.add({ targets: img, x: Math.round(this.w / 2), duration: 180, ease: "Cubic.Out" });
    if (holdMs > 0) this.scene.tweens.add({ targets: img, alpha: 0, delay: holdMs, duration: 200, ease: "Stepped", easeParams: [4], onComplete: () => img.destroy() });
    return img;
  }

  /** The place, in small gold capitals in the upper bar. */
  caption(t: Terrain, ms: number): void {
    this.banner(textKey(this.scene, TERRAIN_LORE[t].subtitle, "#b8964a"), 7, ms, 0);
  }

  /** The ability's name, big, sliding into the upper bar. */
  ability(name: string, side: 1 | -1, holdMs: number): void {
    const back = this.scene.add.rectangle(0, 0, this.w, TOP_BAR - 1, INK).setOrigin(0, 0);
    this.ui.add(back);
    this.transient.push(back);
    this.banner(textKey(this.scene, name, GOLD, 2, "#6a4a10"), 3, holdMs, -side * 40);
    this.scene.time.delayedCall(holdMs + 220, () => back.destroy());
  }

  /** The closing title in the upper bar and its line beneath. */
  outcome(title: string, sub: string, now = false): void {
    const back = this.scene.add.rectangle(0, 0, this.w, TOP_BAR - 1, INK).setOrigin(0, 0);
    const ribbon = this.scene.add.rectangle(0, TOP_BAR, this.w, 11, INK, 0.75).setOrigin(0, 0);
    this.ui.add([back, ribbon]);
    const big = this.banner(textKey(this.scene, title, GOLD, 2, "#6a4a10"), 3, 0, 0);
    const line = this.banner(textKey(this.scene, sub, BONE), TOP_BAR + 2, 0, 0);
    if (now) return;
    [big, line, ribbon].forEach((o) => o.setAlpha(0));
    this.scene.tweens.add({ targets: [big, ribbon], alpha: 1, duration: 160, ease: "Stepped", easeParams: [3] });
    this.scene.tweens.add({ targets: line, alpha: 1, delay: 160, duration: 160, ease: "Stepped", easeParams: [3] });
  }

  flash(color: number, alpha: number, ms: number): void {
    this.flashRect.setFillStyle(color).setAlpha(alpha);
    this.scene.tweens.killTweensOf(this.flashRect);
    this.scene.tweens.add({ targets: this.flashRect, alpha: 0, duration: ms, ease: "Stepped", easeParams: [4] });
  }

  speed(on: boolean, dir: 1 | -1 = 1): void {
    this.streakDir = dir;
    this.scene.tweens.killTweensOf(this.streaks);
    this.scene.tweens.add({ targets: this.streaks, alpha: on ? 0.55 : 0, duration: on ? 60 : 180, ease: "Stepped", easeParams: [3] });
  }

  tick(dt: number): void {
    if (this.streaks.alpha > 0) this.streaks.tilePositionX = Math.round(this.streaks.tilePositionX - dt * 600 * this.streakDir);
  }

  clearTransient(): void {
    this.flashRect.setAlpha(0);
    this.streaks.setAlpha(0);
    this.transient.splice(0).forEach((o) => o.destroy());
  }
}
