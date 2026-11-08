import Phaser from "phaser";
import type { Unit } from "../../engine/types";
import { FLOOR_Y } from "./pixel/painter";
import type { FrameId, SpriteSheet } from "./pixel/sheet";
import { SHEETS } from "./pixel/sheets";
import { frameKey, paintDissolve, paintSheet } from "./pixel/textures";

interface Anim {
  frames: FrameId[];
  fps: number;
  loop: boolean;
}

const IDLE: Anim = { frames: ["idle0", "idle1"], fps: 2.4, loop: true };

/**
 * One chessman in the pixel duel: a frame-based sprite from its hand-pixeled sheet, standing on
 * the floor at integer pixels. `x` is the floor position, `air` the height above it; `face`
 * +1 looks right. Frames switch like a real sprite sheet (no limb tweening, no scaling), and the
 * sprite only ever rotates whole for the somersault and backflip.
 */
export class DuelSprite {
  readonly sheet: SpriteSheet;
  readonly img: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  x: number;
  air = 0;
  /** Extra pixels of sway (recoil, bob) applied to the drawn position only. */
  dx = 0;
  face: 1 | -1;
  frame: FrameId = "idle0";
  private anim: Anim | null = IDLE;
  private t = 0;
  private ghosts = 0;
  /** Set once the sprite is dissolving; poses no longer apply. */
  gone = false;

  constructor(private scene: Phaser.Scene, private layer: Phaser.GameObjects.Container, readonly unit: Unit, x: number, face: 1 | -1) {
    this.sheet = SHEETS[unit.type];
    paintSheet(scene, unit);
    this.x = x;
    this.face = face;
    this.shadow = scene.add.image(0, FLOOR_Y + 1, "px-shadow").setScale(this.sheet.w > 70 ? 2 : 1, 1);
    this.img = scene.add.image(0, 0, frameKey(unit, "idle0"));
    layer.add([this.shadow, this.img]);
    this.t = Math.random() * 2;
    this.sync();
  }

  get mounted(): boolean {
    return this.sheet.w > 70;
  }

  /** Shows one frame and stops any animation. */
  set(frame: FrameId): void {
    this.anim = null;
    this.show(frame);
  }

  /** Cycles `frames` at `fps`; looping animations run until the next `set`/`play`. */
  play(frames: FrameId[], fps: number, loop = true): void {
    this.anim = { frames, fps, loop };
    this.t = 0;
    this.show(frames[0]);
  }

  idle(): void {
    this.anim = IDLE;
    this.t = 0;
  }

  run(fps = 10): void {
    this.play(["walk0", "walk1", "walk2", "walk3"], fps);
  }

  private show(frame: FrameId): void {
    this.frame = frame;
    if (!this.gone) this.img.setTexture(frameKey(this.unit, frame));
  }

  tick(dt: number): void {
    if (this.anim) {
      this.t += dt;
      const n = this.anim.frames.length;
      const i = Math.floor(this.t * this.anim.fps);
      this.show(this.anim.frames[this.anim.loop ? i % n : Math.min(i, n - 1)]);
    }
    this.sync();
  }

  /** Places the image so the foot pixel lands on (x, FLOOR_Y - air), mirrored for left-facing. */
  sync(): void {
    const { w, h, foot } = this.sheet;
    const fx = this.face > 0 ? foot[0] : w - 1 - foot[0];
    this.img.setFlipX(this.face < 0).setOrigin((fx + 0.5) / w, (foot[1] + 0.5) / h);
    this.img.setPosition(Math.round(this.x + this.dx), Math.round(FLOOR_Y - this.air));
    this.shadow.setPosition(Math.round(this.x), FLOOR_Y + 1).setAlpha(this.gone ? 0 : Phaser.Math.Clamp(1 - this.air / 60, 0.2, 1));
  }

  /** The weapon's point in the current frame (screen pixels), or the chest when the sheet gives none. */
  tip(): Phaser.Math.Vector2 {
    const t = this.sheet.tips?.[this.frame];
    if (!t) return this.chest();
    const { foot } = this.sheet;
    return new Phaser.Math.Vector2(Math.round(this.x + this.face * (t[0] - foot[0])), Math.round(FLOOR_Y - this.air - (foot[1] - t[1])));
  }

  /** Where blows land: mid-body. */
  chest(): Phaser.Math.Vector2 {
    const up = this.mounted ? 34 : this.sheet.h * 0.42;
    return new Phaser.Math.Vector2(Math.round(this.x), Math.round(FLOOR_Y - this.air - up));
  }

  /** Floor distance from which this chessman's weapon reaches the foe. */
  reach(): number {
    return this.mounted ? 44 : Math.round(this.sheet.w * 0.5);
  }

  flash(color: number | null): void {
    if (color === null) this.img.clearTint();
    else this.img.setTintFill(color);
  }

  /** A single-colour afterimage of the current frame, fading behind the sprite. */
  ghost(color: number, alpha = 0.5, ms = 220): void {
    if (this.ghosts >= 6 || this.gone) return;
    this.ghosts++;
    const g = this.scene.add.image(this.img.x, this.img.y, this.img.texture.key).setOrigin(this.img.originX, this.img.originY).setFlipX(this.img.flipX).setRotation(this.img.rotation).setTintFill(color).setAlpha(alpha);
    this.layer.addAt(g, this.layer.getIndex(this.img));
    this.scene.tweens.add({ targets: g, alpha: 0, duration: ms, onComplete: () => {
      this.ghosts--;
      g.destroy();
    } });
  }

  /** Breaks the sprite down in a dither pattern, flickering white, over `ms`. */
  dissolve(ms: number): void {
    const keys = paintDissolve(this.scene, this.unit, this.frame, 8);
    this.anim = null;
    this.gone = true;
    this.img.clearTint();
    this.scene.tweens.addCounter({ from: 0, to: keys.length, duration: ms, onUpdate: (tw) => {
      const i = Math.floor(tw.getValue() ?? 0);
      if (!this.img.active) return;
      if (i >= keys.length) this.img.setVisible(false);
      else this.img.setTexture(keys[i]);
    }, onComplete: () => this.img.active && this.img.setVisible(false) });
    this.sync();
  }

  hide(): void {
    this.gone = true;
    this.img.setVisible(false);
    this.shadow.setVisible(false);
  }
}
