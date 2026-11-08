import Phaser from "phaser";
import type { Cell, Order, Pos, Unit } from "../../engine/types";
import { LAYER, TOP_LAYER, depthOf } from "../iso";
import { UNIT_FOOT, UNIT_H, unitKey, FACTIONS } from "../art/unitArt";
import type { BoardView } from "./BoardView";
import type { Fx } from "./Fx";
import { sfx } from "../../audio/sfx";

interface Token {
  unit: Unit;
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  bob: Phaser.Tweens.Tween;
}

interface Leg {
  to: Pos;
  duration: number;
  arc: number;
  capture: boolean;
}

interface Proxy {
  r: number;
  c: number;
  lift: number;
}

const tint = (owner: 0 | 1): number => Phaser.Display.Color.HexStringToColor(FACTIONS[owner].css).color;

export class UnitView {
  private tokens = new Map<number, Token>();

  constructor(private scene: Phaser.Scene, private board: BoardView, private fx: Fx) {}

  private create(unit: Unit, r: number, c: number): Token {
    const shadow = this.scene.add.image(0, 0, "shadow").setScale(0.75);
    const body = this.scene.add.image(0, 0, unitKey(unit.type, unit.owner)).setOrigin(0.5, UNIT_FOOT / UNIT_H).setScale(0.82);
    const root = this.scene.add.container(0, 0, [shadow, body]);
    const bob = this.scene.tweens.add({
      targets: body,
      y: -2,
      duration: 900 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
      delay: Math.random() * 800,
    });
    const token = { unit, root, body, shadow, bob };
    this.place(token, { r, c, lift: 0 });
    return token;
  }

  private place(t: Token, p: Proxy): void {
    const r0 = Math.floor(p.r);
    const c0 = Math.floor(p.c);
    const a = this.board.center(r0, c0);
    const b = this.board.center(Math.ceil(p.r), Math.ceil(p.c));
    const fr = p.r - r0 + (p.c - c0);
    const k = Math.min(1, fr / 2 || 0);
    const ground = a.y + (b.y - a.y) * k;
    const x = a.x + (b.x - a.x) * k;
    t.root.setPosition(x, ground);
    t.body.setY(-p.lift);
    t.shadow.setScale(0.75 - Math.min(0.35, p.lift / 200)).setAlpha(1 - Math.min(0.5, p.lift / 160));
    const depth = p.lift > 4 ? TOP_LAYER - 10 : depthOf(Math.round(p.r), Math.round(p.c), LAYER.unit);
    t.root.setDepth(depth);
  }

  sync(board: Cell[][]): void {
    const seen = new Set<number>();
    board.forEach((row, r) =>
      row.forEach((u, c) => {
        if (!u) return;
        seen.add(u.id);
        const existing = this.tokens.get(u.id);
        if (!existing) {
          this.tokens.set(u.id, this.create(u, r, c));
          return;
        }
        if (existing.unit.type !== u.type || existing.unit.owner !== u.owner) existing.body.setTexture(unitKey(u.type, u.owner));
        existing.unit = u;
        this.place(existing, { r, c, lift: 0 });
      }),
    );
    for (const [id, t] of this.tokens) {
      if (!seen.has(id)) this.remove(id, t);
    }
  }

  private remove(id: number, t: Token): void {
    t.bob.remove();
    t.root.destroy();
    this.tokens.delete(id);
  }

  setVisibility(visible: (pos: Pos, u: Unit) => boolean, board: Cell[][]): void {
    board.forEach((row, r) =>
      row.forEach((u, c) => {
        const t = u && this.tokens.get(u.id);
        if (t) t.root.setVisible(visible([r, c], u));
      }),
    );
  }

  highlight(unitId: number | null): void {
    for (const [id, t] of this.tokens) {
      const on = id === unitId;
      t.body.setScale(on ? 0.9 : 0.82);
    }
  }

  private tweenProxy(t: Token, from: Proxy, to: Proxy, duration: number, arc: number, ease = "Sine.InOut"): Promise<void> {
    const p = { ...from };
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: p,
        r: to.r,
        c: to.c,
        duration,
        ease,
        onUpdate: (tw) => {
          p.lift = Math.sin(tw.progress * Math.PI) * arc;
          this.place(t, p);
        },
        onComplete: () => {
          p.lift = 0;
          this.place(t, p);
          resolve();
        },
      });
    });
  }

  private async impact(victims: Unit[], at: Pos): Promise<void> {
    for (const v of victims) {
      const t = this.tokens.get(v.id);
      if (!t) continue;
      const { x, y } = this.board.center(at[0], at[1]);
      this.fx.shatter(t.root.x, t.root.y - 30, tint(v.owner));
      this.fx.shockwave(x, y, 0xffe9a8);
      this.fx.floatText(x, y - 70, v.type === "king" ? "KING SLAIN!" : "CAPTURED", "#ffe08a");
      this.fx.shake(v.type === "king" ? 0.014 : 0.005, v.type === "king" ? 500 : 200);
      sfx.capture(v.type === "king");
      this.remove(v.id, t);
    }
  }

  async animateOrder(order: Order, before: Cell[][]): Promise<void> {
    const t = this.tokens.get(order.unitId);
    if (!t) return;
    t.bob.pause();
    t.body.setY(0);
    let cur: Proxy = { r: order.from[0], c: order.from[1], lift: 0 };
    for (const step of this.legs(order)) {
      const next: Proxy = { r: step.to[0], c: step.to[1], lift: 0 };
      sfx.move(step.arc > 0);
      if (step.capture) await this.wait(60);
      await this.tweenProxy(t, cur, next, step.duration, step.arc, step.arc > 30 ? "Quad.InOut" : "Sine.InOut");
      const { x, y } = this.board.center(step.to[0], step.to[1]);
      this.fx.dust(x, y, step.arc > 30 ? 12 : 5);
      if (step.arc > 30) this.fx.shockwave(x, y, 0xffffff, 0.6);
      const victim = step.capture ? before[step.to[0]][step.to[1]] : null;
      if (victim) await this.impact([victim], step.to);
      cur = next;
    }
    t.bob.resume();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((res) => this.scene.time.delayedCall(ms, res));
  }

  private legs(order: Order): Leg[] {
    const isCapture = (p: Pos) => order.captures.some((c) => c[0] === p[0] && c[1] === p[1]);
    if (order.style === "slide") return order.path.map((to) => ({ to, duration: 150, arc: 6, capture: isCapture(to) }));
    if (order.style === "joust") return [{ to: order.path[0], duration: 220, arc: 40, capture: isCapture(order.path[0]) }, { to: order.to, duration: 220, arc: 30, capture: isCapture(order.to) }];
    const arcs: Record<string, number> = { step: 10, jump: 70, flip: 80 };
    return [{ to: order.to, duration: order.style === "step" ? 260 : 560, arc: arcs[order.style], capture: isCapture(order.to) }];
  }

  async perish(unit: Unit, at: Pos): Promise<void> {
    const t = this.tokens.get(unit.id);
    if (!t) return;
    const { x, y } = this.board.center(at[0], at[1]);
    this.fx.sandSink(x, y);
    this.fx.floatText(x, y - 60, "LOST TO THE SANDS", "#ffcf7a");
    sfx.perish();
    t.bob.remove();
    await new Promise<void>((res) =>
      this.scene.tweens.add({ targets: t.body, y: 40, alpha: 0, duration: 900, ease: "Quad.In", onComplete: () => res() }),
    );
    this.remove(unit.id, t);
  }

  async promote(at: Pos, after: Cell[][]): Promise<void> {
    const u = after[at[0]][at[1]];
    const t = u && this.tokens.get(u.id);
    if (!t || !u) return;
    const { x, y } = this.board.center(at[0], at[1]);
    this.fx.beam(x, y, 0xfff2a8);
    this.fx.sparkle(x, y - 20);
    this.fx.floatText(x, y - 80, "PROMOTED!", "#fff2a8");
    sfx.promote();
    await this.wait(300);
    t.body.setTexture(unitKey(u.type, u.owner));
    t.unit = u;
    await this.wait(400);
  }

  pulse(unitId: number): void {
    const t = this.tokens.get(unitId);
    if (!t) return;
    this.scene.tweens.add({ targets: t.body, scaleX: 0.95, scaleY: 0.76, duration: 90, yoyo: true, ease: "Quad.Out" });
  }

  get count(): number {
    return this.tokens.size;
  }
}
