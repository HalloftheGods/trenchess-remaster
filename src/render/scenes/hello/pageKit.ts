import Phaser from "phaser";
import type { Tutorial } from "../../../game/tutorial";
import { FONT, motionMs } from "../../ui/fonts";

/** The tome's page in its own (unscaled) coordinates. */
export const PANEL_W = 520;
export const PANEL_H = 760;
export const PAD = 32;
export const INNER = PANEL_W - PAD * 2;
export const BODY_TOP = 108;
export const NAV_Y = PANEL_H - 72;

/** Inks that read on the parchment. */
export const INK = {
  dark: "#2a1d06",
  soft: "#5c4524",
  faint: "#7d6a45",
  accent: "#8a2f14",
  green: "#1f6b2e",
  gold: "#8a6410",
  note: 0xfff1a8,
};

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

export const PAGE_TEXT: Record<"kicker" | "title" | "h3" | "body" | "small" | "quote", TextStyle> = {
  kicker: { fontFamily: FONT.display, fontSize: "13px", fontStyle: "600", color: INK.accent, letterSpacing: 4 },
  title: { fontFamily: FONT.display, fontSize: "30px", fontStyle: "800", color: INK.dark },
  h3: { fontFamily: FONT.display, fontSize: "19px", fontStyle: "600", color: INK.dark },
  body: { fontFamily: FONT.body, fontSize: "16px", color: INK.dark, lineSpacing: 5 },
  small: { fontFamily: FONT.body, fontSize: "13px", color: INK.soft, lineSpacing: 3 },
  quote: { fontFamily: FONT.display, fontSize: "19px", fontStyle: "italic 600", color: INK.accent, lineSpacing: 4 },
};

export interface PageCtx {
  scene: Phaser.Scene;
  tutorial: Tutorial;
  /** Every object a page adds; the scene slides them in and destroys them on the next turn. */
  objects: Phaser.GameObjects.GameObject[];
  add<T extends Phaser.GameObjects.GameObject>(o: T): T;
  go(index: number): void;
  back(): void;
}

export interface PageView {
  destroy(): void;
  /** Return true when the page consumed the key (the scene then leaves it alone). */
  onKey?(e: KeyboardEvent): boolean;
}

export type PageBuilder = (ctx: PageCtx) => PageView;

/** Lays text and blocks top to bottom from `BODY_TOP`, tracking the cursor. */
export class Flow {
  y = BODY_TOP;

  constructor(private ctx: PageCtx) {}

  text(text: string, kind: keyof typeof PAGE_TEXT, width = INNER, x = PAD): Phaser.GameObjects.Text {
    const t = this.ctx.add(this.ctx.scene.add.text(x, this.y, text, { ...PAGE_TEXT[kind], wordWrap: { width } }).setOrigin(0, 0));
    this.y += t.height + 10;
    return t;
  }

  gap(h: number): void {
    this.y += h;
  }

  /** A hand-drawn rule across the page. */
  rule(): void {
    const g = this.ctx.add(this.ctx.scene.add.graphics());
    g.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(INK.faint).color, 0.6);
    g.lineBetween(PAD, this.y + 4, PAD + INNER, this.y + 4);
    this.y += 16;
  }

  /** A sticky note, slightly tilted, with its own text. */
  sticky(text: string, w = INNER - 40, tilt = -2): Phaser.GameObjects.Container {
    const c = this.ctx.add(this.ctx.scene.add.container(PAD + 20 + w / 2, this.y));
    const body = this.ctx.scene.add.text(0, 12, text, { ...PAGE_TEXT.body, fontSize: "15px", color: INK.dark, wordWrap: { width: w - 28 } }).setOrigin(0.5, 0);
    const h = body.height + 26;
    const paper = this.ctx.scene.add.rectangle(0, h / 2, w, h, INK.note).setStrokeStyle(1, 0xc9b25a, 0.9);
    const shadow = this.ctx.scene.add.rectangle(3, h / 2 + 4, w, h, 0x000000, 0.18);
    const tape = this.ctx.scene.add.rectangle(0, 0, 54, 12, 0xffffff, 0.5);
    c.add([shadow, paper, body, tape]).setAngle(tilt);
    this.y += h + 18;
    return c;
  }

  /** A tip line with a gold pointer. */
  tip(text: string): void {
    const arrow = this.ctx.add(this.ctx.scene.add.text(PAD, this.y, "☛", { fontFamily: FONT.body, fontSize: "18px", color: INK.gold }).setOrigin(0, 0));
    const body = this.ctx.add(this.ctx.scene.add.text(PAD + 26, this.y + 1, text, { ...PAGE_TEXT.small, fontSize: "14px", color: INK.gold, wordWrap: { width: INNER - 26 } }).setOrigin(0, 0));
    this.y += Math.max(arrow.height, body.height) + 10;
  }
}

/** The chapter kicker and title at the top of a page. */
export const headline = (ctx: PageCtx, kicker: string, title: string): void => {
  ctx.add(ctx.scene.add.text(PAD, 34, kicker.toUpperCase(), PAGE_TEXT.kicker).setOrigin(0, 0));
  const t = ctx.add(ctx.scene.add.text(PAD, 54, title, PAGE_TEXT.title).setOrigin(0, 0));
  for (const size of [26, 22]) {
    if (t.width > INNER) t.setFontSize(size);
  }
};

/** A marker-pen circle around a spot, drawn on in a few frames. */
export const penCircle = (ctx: PageCtx, x: number, y: number, rx: number, ry: number): void => {
  const g = ctx.add(ctx.scene.add.graphics());
  const color = Phaser.Display.Color.HexStringToColor(INK.accent).color;
  const state = { k: 0 };
  const draw = (): void => {
    g.clear();
    g.lineStyle(3, color, 0.85);
    g.beginPath();
    const n = Math.max(2, Math.floor(40 * state.k));
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + (i / 40) * Math.PI * 2.08;
      const wob = 1 + Math.sin(i * 1.7) * 0.03;
      const px = x + Math.cos(a) * rx * wob;
      const py = y + Math.sin(a) * ry * wob;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();
  };
  ctx.scene.tweens.add({ targets: state, k: 1, duration: motionMs(420), delay: motionMs(300), onUpdate: draw, onComplete: draw });
};
