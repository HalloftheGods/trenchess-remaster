import Phaser from "phaser";
import type { Cell, Order, Pos, Unit } from "../../engine/types";
import { LAYER, TOP_LAYER, depthOf, standOffset } from "../iso";
import { UNIT_FOOT, UNIT_H, unitKey } from "../art/unitArt";
import type { BoardView } from "./BoardView";
import type { Fx } from "./Fx";
import { sfx } from "../../audio/sfx";
import { UnitDrama } from "./UnitDrama";
import { factionTint, legsOf, type Proxy, type Token } from "./unitToken";

export class UnitView {
  private tokens = new Map<number, Token>();
  private drama: UnitDrama;
  private ghostImg: Phaser.GameObjects.Image | null = null;

  constructor(private scene: Phaser.Scene, private board: BoardView, private fx: Fx) {
    this.drama = new UnitDrama(scene, board, fx, this.tokens, (id, t) => this.remove(id, t));
  }

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
    body.preFX?.setPadding(18);
    const token: Token = { unit, root, body, shadow, bob, glow: null, r, c };
    this.place(token, { r, c, lift: 0 });
    return token;
  }

  /** Stand the token on a (possibly fractional) cell: foot on the surface, plus the top-view stand offset. */
  private place(t: Token, p: Proxy): void {
    const r0 = Math.floor(p.r);
    const c0 = Math.floor(p.c);
    const a = this.board.center(r0, c0);
    const b = this.board.center(Math.ceil(p.r), Math.ceil(p.c));
    const fr = p.r - r0 + (p.c - c0);
    const k = Math.min(1, fr / 2 || 0);
    const ground = a.y + (b.y - a.y) * k + standOffset();
    const x = a.x + (b.x - a.x) * k;
    t.root.setPosition(x, ground);
    t.r = p.r;
    t.c = p.c;
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
      this.setGlow(t, on);
    }
  }

  /** Selection glow (WebGL only: preFX is null on the canvas renderer). */
  private setGlow(t: Token, on: boolean): void {
    if (on === (t.glow !== null)) return;
    if (!on) {
      t.body.preFX?.remove(t.glow!);
      t.glow = null;
      return;
    }
    t.glow = t.body.preFX?.addGlow(factionTint(t.unit.owner), 4, 0, false, 0.15, 18) ?? null;
    if (t.glow) this.scene.tweens.add({ targets: t.glow, outerStrength: 7, duration: 700, yoyo: true, repeat: -1, ease: "Sine.InOut" });
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

  async animateOrder(order: Order, before: Cell[][]): Promise<void> {
    const t = this.tokens.get(order.unitId);
    if (!t) return;
    t.bob.pause();
    t.body.setY(0);
    let cur: Proxy = { r: order.from[0], c: order.from[1], lift: 0 };
    for (const step of legsOf(order)) {
      const next: Proxy = { r: step.to[0], c: step.to[1], lift: 0 };
      sfx.move(step.arc > 0);
      if (step.capture) await this.wait(60);
      await this.tweenProxy(t, cur, next, step.duration, step.arc, step.arc > 30 ? "Quad.InOut" : "Sine.InOut");
      const { x, y } = this.board.center(step.to[0], step.to[1]);
      this.fx.dust(x, y, step.arc > 30 ? 12 : 5);
      if (step.arc > 30) this.fx.shockwave(x, y, 0xffffff, 0.6);
      const victim = step.capture ? before[step.to[0]][step.to[1]] : null;
      if (victim) await this.drama.impact([victim], step.to);
      cur = next;
    }
    t.bob.resume();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((res) => this.scene.time.delayedCall(ms, res));
  }

  perish(unit: Unit, at: Pos): Promise<void> {
    return this.drama.perish(unit, at);
  }

  promote(at: Pos, after: Cell[][]): Promise<void> {
    return this.drama.promote(at, after);
  }

  celebrate(owner: 0 | 1): void {
    this.drama.celebrate(owner);
  }

  ghost(unit: Unit | null, at: Pos | null): void {
    this.ghostImg?.destroy();
    this.ghostImg = null;
    if (!unit || !at) return;
    const { x, y } = this.board.center(at[0], at[1]);
    this.ghostImg = this.scene.add
      .image(x, y + standOffset(), unitKey(unit.type, unit.owner))
      .setOrigin(0.5, UNIT_FOOT / UNIT_H)
      .setScale(0.82)
      .setAlpha(0.45)
      .setTintFill(0xbff6ff)
      .setDepth(depthOf(at[0], at[1], LAYER.unit) + 0.5);
    this.scene.tweens.add({ targets: this.ghostImg, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
  }

  relayout(board: Cell[][], duration: number): void {
    board.forEach((row, r) =>
      row.forEach((u, c) => {
        const t = u && this.tokens.get(u.id);
        if (t) this.slide(t, r, c, duration);
      }),
    );
  }

  /** Relayout every token to the cell it last stood on (for view changes that have no board at hand). */
  relayoutAll(duration: number): void {
    for (const t of this.tokens.values()) this.slide(t, Math.round(t.r), Math.round(t.c), duration);
  }

  private slide(t: Token, r: number, c: number, duration: number): void {
    const { x, y } = this.board.center(r, c);
    t.r = r;
    t.c = c;
    t.root.setDepth(depthOf(r, c, LAYER.unit));
    this.scene.tweens.add({ targets: t.root, x, y: y + standOffset(), duration, ease: "Cubic.InOut" });
  }

  retexture(): void {
    for (const t of this.tokens.values()) t.body.setTexture(unitKey(t.unit.type, t.unit.owner));
  }

  setSpent(ids: number[]): void {
    for (const [id, t] of this.tokens) {
      if (ids.includes(id)) t.body.setTint(0x8a8a8a);
      else t.body.clearTint();
    }
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
