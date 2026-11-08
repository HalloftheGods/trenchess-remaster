import Phaser from "phaser";
import type { Cell, Pos, Unit } from "../../engine/types";
import { unitKey } from "../art/unitArt";
import { sfx } from "../../audio/sfx";
import type { BoardView } from "./BoardView";
import type { Fx } from "./Fx";
import { factionTint, type Token } from "./unitToken";

/** The big moments: captures, the desert claiming a piece, promotion and the victory lap. */
export class UnitDrama {
  constructor(
    private scene: Phaser.Scene,
    private board: BoardView,
    private fx: Fx,
    private tokens: Map<number, Token>,
    private remove: (id: number, t: Token) => void,
  ) {}

  private wait(ms: number): Promise<void> {
    return new Promise((res) => this.scene.time.delayedCall(ms, res));
  }

  async impact(victims: Unit[], at: Pos): Promise<void> {
    for (const v of victims) {
      const t = this.tokens.get(v.id);
      if (!t) continue;
      const { x, y } = this.board.center(at[0], at[1]);
      this.fx.shatter(t.root.x, t.root.y - 30, factionTint(v.owner));
      this.fx.shockwave(x, y, 0xffe9a8);
      this.fx.floatText(x, y - 70, v.type === "king" ? "KING SLAIN!" : "CAPTURED", "#ffe08a");
      this.fx.shake(v.type === "king" ? 0.014 : 0.005, v.type === "king" ? 500 : 200);
      sfx.capture(v.type === "king");
      this.remove(v.id, t);
    }
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

  celebrate(owner: 0 | 1): void {
    const color = factionTint(owner);
    let i = 0;
    for (const t of this.tokens.values()) {
      if (t.unit.owner !== owner) continue;
      const delay = i++ * 90;
      this.scene.tweens.add({ targets: t.body, y: -26, duration: 260, yoyo: true, repeat: 3, delay, ease: "Quad.Out" });
    }
    for (let k = 0; k < 9; k++) {
      this.scene.time.delayedCall(k * 320, () => {
        const x = Phaser.Math.Between(-420, 420);
        const y = Phaser.Math.Between(-60, 380);
        this.fx.firework(x, y, k % 2 ? color : 0xf2c94c);
      });
    }
  }
}
