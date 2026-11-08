import Phaser from "phaser";
import type { Terrain, Unit } from "../../engine/types";
import { TERRAIN_LORE, UNIT_LORE } from "../../game/lore";
import { FACTIONS } from "../art/unitArt";
import { COLOR, FONT } from "../ui/fonts";
import { FX } from "./duelFx";

const hex = (css: string): number => Phaser.Display.Color.HexStringToColor(css).color;

interface Plate {
  root: Phaser.GameObjects.Container;
  y: number;
  fill: Phaser.GameObjects.Rectangle;
  ghost: Phaser.GameObjects.Rectangle;
  home: number;
}

/** Gold text with a dark rim and a drop shadow, filled top-to-bottom like struck metal. */
const goldText = (scene: Phaser.Scene, x: number, y: number, text: string, size: number, spacing: number): Phaser.GameObjects.Text => {
  const t = scene.add.text(x, y, text, { fontFamily: FONT.display, fontSize: `${size}px`, fontStyle: "800", color: COLOR.goldHex, letterSpacing: spacing }).setOrigin(0.5);
  const grad = t.context.createLinearGradient(0, 0, 0, t.height);
  grad.addColorStop(0, "#fffbe0");
  grad.addColorStop(0.45, "#f2c94c");
  grad.addColorStop(0.55, "#c8961e");
  grad.addColorStop(1, "#fff0b0");
  t.setFill(grad).setStroke("#1a1206", Math.max(3, size / 9)).setShadow(0, size / 12, "#000000", size / 5, true, true);
  return t;
};

/**
 * The duel's screen furniture, drawn on the steady UI camera so camera zoom and shake never move
 * it: the letterbox bars that close over the board and open on the arena, the two name plates
 * with health bars, the location caption, the ability banner, the outcome title and the flash.
 */
export class DuelHud {
  readonly topH: number;
  readonly botH: number;
  private readonly top: Phaser.GameObjects.Rectangle;
  private readonly bot: Phaser.GameObjects.Rectangle;
  private readonly topLine: Phaser.GameObjects.Rectangle;
  private readonly botLine: Phaser.GameObjects.Rectangle;
  private readonly plates: [Plate, Plate];
  private readonly flashRect: Phaser.GameObjects.Rectangle;
  private readonly streaks: Phaser.GameObjects.TileSprite;
  private readonly fs: number;
  private bars = { top: 0, bot: 0 };

  constructor(private scene: Phaser.Scene, private ui: Phaser.GameObjects.Container, private w: number, private h: number, left: Unit, right: Unit) {
    this.fs = Phaser.Math.Clamp(h / 720, 0.7, 1.6);
    this.topH = Math.round(h * 0.1);
    this.botH = Math.round(h * 0.15);
    this.streaks = scene.add.tileSprite(0, 0, w, h, FX.streak).setOrigin(0, 0).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setTileScale(Math.max(1, h / 256));
    this.flashRect = scene.add.rectangle(0, 0, w, h, 0xffffff).setOrigin(0, 0).setAlpha(0);
    this.top = scene.add.rectangle(0, 0, w, 1, 0x05060a).setOrigin(0, 0);
    this.bot = scene.add.rectangle(0, h, w, 1, 0x05060a).setOrigin(0, 1);
    this.topLine = scene.add.rectangle(0, 0, w, 2, COLOR.gold).setOrigin(0, 0);
    this.botLine = scene.add.rectangle(0, h, w, 2, COLOR.gold).setOrigin(0, 1);
    ui.add([this.streaks, this.flashRect, this.top, this.bot, this.topLine, this.botLine]);
    this.plates = [this.plate(left, 1), this.plate(right, -1)];
    this.setBars(0, 0);
  }

  /** Bar heights as fractions: 0 is gone, 1 is closed over half the screen, `open` is the letterbox. */
  setBars(top: number, bot: number): void {
    this.bars = { top, bot };
    const th = Math.max(0.0001, top * (this.h / 2));
    const bh = Math.max(0.0001, bot * (this.h / 2));
    this.top.setScale(1, th);
    this.bot.setScale(1, bh);
    this.topLine.setY(th - 1).setVisible(top > 0.001);
    this.botLine.setY(this.h - bh + 1).setVisible(bot > 0.001);
  }

  get barState(): { top: number; bot: number } {
    return this.bars;
  }

  get open(): { top: number; bot: number } {
    return { top: this.topH / (this.h / 2), bot: this.botH / (this.h / 2) };
  }

  private plate(unit: Unit, dir: 1 | -1): Plate {
    const s = this.scene;
    const f = FACTIONS[unit.owner];
    const fs = this.fs;
    const pw = Math.min(360 * fs, this.w * 0.42);
    const ph = Math.min(this.botH * 0.74, 70 * fs);
    const home = dir > 0 ? 18 : this.w - 18 - pw;
    const root = s.add.container(home, this.h - this.botH + (this.botH - ph) / 2);
    const g = s.add.graphics();
    g.fillStyle(0x0b0f1a, 0.94).fillRoundedRect(0, 0, pw, ph, 6);
    g.fillStyle(0xffffff, 0.04).fillRoundedRect(2, 2, pw - 4, ph * 0.45, 5);
    g.lineStyle(1.5, COLOR.gold, 0.85).strokeRoundedRect(0, 0, pw, ph, 6);
    g.fillStyle(hex(f.css), 1).fillRect(dir > 0 ? 0 : pw - 7, 3, 7, ph - 6);
    const pad = 18;
    const tx = dir > 0 ? pad : pw - pad;
    const ox = dir > 0 ? 0 : 1;
    const name = s.add.text(tx, ph * 0.1, UNIT_LORE[unit.type].title, { fontFamily: FONT.display, fontSize: `${Math.round(19 * fs)}px`, fontStyle: "700", color: COLOR.bone }).setOrigin(ox, 0);
    const sub = s.add.text(tx, ph * 0.1 + 24 * fs, `${f.name} ${UNIT_LORE[unit.type].chess} · ${UNIT_LORE[unit.type].ability}`, { fontFamily: FONT.body, fontSize: `${Math.round(11 * fs)}px`, color: f.css }).setOrigin(ox, 0);
    const bw = pw - pad * 2 - 30 * fs;
    const by = ph - 16 * fs;
    const bx = dir > 0 ? pad + 30 * fs : pad;
    const hp = s.add.text(dir > 0 ? pad : pw - pad, by + 3 * fs, "HP", { fontFamily: FONT.display, fontSize: `${Math.round(11 * fs)}px`, fontStyle: "700", color: COLOR.goldHex }).setOrigin(ox, 0.5);
    const frame = s.add.rectangle(bx, by, bw, 7 * fs, 0x000000).setOrigin(0, 0).setStrokeStyle(1, 0x3a3f52);
    const ghost = s.add.rectangle(bx, by, bw, 7 * fs, 0xffffff).setOrigin(0, 0);
    const fill = s.add.rectangle(bx, by, bw, 7 * fs, hex(f.css)).setOrigin(0, 0);
    if (dir < 0) {
      [ghost, fill].forEach((r) => r.setOrigin(1, 0).setX(bx + bw));
    }
    root.add([g, name, sub, hp, frame, ghost, fill]);
    root.setAlpha(0);
    this.ui.add(root);
    return { root, fill, ghost, home, y: root.y };
  }

  /** Plates rise into the lower bar. */
  showPlates(ms: number): void {
    this.plates.forEach((p, i) => {
      p.root.setAlpha(0).setY(p.y + 30);
      this.scene.tweens.add({ targets: p.root, alpha: 1, y: p.y, duration: ms, delay: i * ms * 0.25, ease: "Cubic.Out" });
    });
  }

  platesNow(): void {
    this.plates.forEach((p) => {
      this.scene.tweens.killTweensOf(p.root);
      p.root.setAlpha(1).setY(p.y);
    });
  }

  /** Drains side `i`'s health bar to `frac`, the white ghost bar catching up after a beat. */
  damage(i: 0 | 1, frac: number, ms: number): void {
    const p = this.plates[i];
    this.scene.tweens.killTweensOf([p.fill, p.ghost]);
    p.fill.setScale(Math.max(0, frac), 1);
    this.scene.tweens.add({ targets: p.ghost, scaleX: Math.max(0, frac), delay: ms * 0.4, duration: ms, ease: "Quad.Out" });
    this.scene.tweens.add({ targets: p.root, x: p.home + Phaser.Math.Between(-5, 5), duration: 40, yoyo: true, repeat: 2, onComplete: () => p.root.setX(p.home) });
  }

  hpNow(i: 0 | 1, frac: number): void {
    const p = this.plates[i];
    this.scene.tweens.killTweensOf([p.fill, p.ghost]);
    p.fill.setScale(frac, 1);
    p.ghost.setScale(frac, 1);
  }

  /** Greys out a fallen chessman's plate. */
  fallen(i: 0 | 1): void {
    this.scene.tweens.add({ targets: this.plates[i].root, alpha: 0.4, duration: 300 });
  }

  /** The place the duel is fought, in small capitals in the upper bar. */
  caption(t: Terrain, ms: number): void {
    const text = this.scene.add.text(this.w / 2, this.topH / 2, TERRAIN_LORE[t].subtitle.toUpperCase(), { fontFamily: FONT.display, fontSize: `${Math.round(13 * this.fs)}px`, fontStyle: "600", color: COLOR.goldHex, letterSpacing: 6 * this.fs }).setOrigin(0.5).setAlpha(0);
    this.ui.add(text);
    this.scene.tweens.add({ targets: text, alpha: 1, duration: 300 });
    this.scene.tweens.add({ targets: text, alpha: 0, delay: ms, duration: 400, onComplete: () => text.destroy() });
  }

  /** The ability's name sweeps across the top of the arena on a dark ribbon. */
  ability(name: string, side: 1 | -1, holdMs: number): void {
    const s = this.scene;
    const y = this.topH / 2;
    const size = Math.round(30 * this.fs);
    const ribbon = s.add.rectangle(this.w / 2, y, this.w, this.topH, 0x05060a, 1).setScale(0, 1);
    const edge = s.add.rectangle(this.w / 2, this.topH - 1, this.w, 2, 0xfff0b0, 1).setScale(0, 1);
    const text = goldText(s, this.w / 2 - side * 80, y, name.toUpperCase(), size, 5 * this.fs).setAlpha(0).setScale(1.25);
    this.ui.add([ribbon, edge, text]);
    s.tweens.add({ targets: [ribbon, edge], scaleX: 1, duration: 140, ease: "Cubic.Out" });
    s.tweens.add({ targets: text, x: this.w / 2, alpha: 1, scale: 1, duration: 220, ease: "Back.Out" });
    s.tweens.add({ targets: text, scaleX: 1.04, scaleY: 1.04, yoyo: true, delay: 240, duration: 140, ease: "Sine.Out" });
    s.tweens.add({ targets: [ribbon, edge, text], alpha: 0, delay: holdMs, duration: 260, onComplete: () => [ribbon, edge, text].forEach((o) => o.destroy()) });
  }

  /** The closing title in the upper bar: "Captured", and who took whom. */
  outcome(title: string, sub: string, now = false): void {
    const s = this.scene;
    const size = Math.round(30 * this.fs);
    const ribbon = s.add.rectangle(this.w / 2, this.topH / 2, this.w, this.topH, 0x05060a, 1);
    const big = goldText(s, this.w / 2, this.topH * 0.4, title.toUpperCase(), size, 10 * this.fs);
    const small = s.add.text(this.w / 2, this.topH * 0.8, sub, { fontFamily: FONT.display, fontSize: `${Math.round(12 * this.fs)}px`, fontStyle: "600", color: COLOR.bone, letterSpacing: 1 }).setOrigin(0.5);
    this.ui.add([ribbon, big, small]);
    if (now) return;
    big.setAlpha(0).setScale(1.5);
    small.setAlpha(0);
    s.tweens.add({ targets: big, alpha: 1, scale: 1, duration: 260, ease: "Back.Out" });
    s.tweens.add({ targets: small, alpha: 1, delay: 180, duration: 260 });
  }

  /** A full-screen flash of `color`. */
  flash(color: number, alpha: number, ms: number): void {
    this.flashRect.setFillStyle(color).setAlpha(alpha);
    this.scene.tweens.killTweensOf(this.flashRect);
    this.scene.tweens.add({ targets: this.flashRect, alpha: 0, duration: ms, ease: "Quad.Out" });
  }

  /** Speed lines over the arena while a fighter dashes; `dir` is the direction of travel. */
  speed(on: boolean, dir: 1 | -1 = 1): void {
    this.streaks.setData("dir", dir);
    this.scene.tweens.killTweensOf(this.streaks);
    this.scene.tweens.add({ targets: this.streaks, alpha: on ? 0.38 : 0, duration: on ? 80 : 220 });
  }

  tick(dt: number): void {
    if (this.streaks.alpha > 0) this.streaks.tilePositionX -= dt * 2600 * ((this.streaks.getData("dir") as number) ?? 1);
  }

  /** Leaves only the bars on screen: the curtain is closing. */
  barsOnly(): void {
    const keep = new Set<Phaser.GameObjects.GameObject>([this.top, this.bot, this.topLine, this.botLine]);
    this.ui.list.forEach((o) => {
      if (!keep.has(o)) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
    });
  }

  /** Hides every transient (banners, captions) for the final picture. */
  clearTransient(): void {
    this.flashRect.setAlpha(0);
    this.streaks.setAlpha(0);
  }
}
