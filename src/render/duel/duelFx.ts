import Phaser from "phaser";
import { FX, type FxId } from "./pixel/fx";
import { FLOOR_Y } from "./pixel/painter";
import { fxKey, paintFx } from "./pixel/textures";

export { paintFx };

interface PlayOpts {
  tint?: number;
  fps?: number;
  flipX?: boolean;
  /** Anchor: "center" (default) or "bottom" (stands on the given y). */
  anchor?: "center" | "bottom";
  hold?: number;
  add?: boolean;
  depthBehind?: Phaser.GameObjects.GameObject;
}

/**
 * Pixel effects for a duel: hand-pixeled frame animations (sparks, slashes, impacts, dust,
 * glints, shock rings, pillars, fences, runes, clouds, beams) and particle bursts of single
 * pixels, all in the duel's low-res world, so they land on the pixel grid.
 */
export class DuelFx {
  private readonly bits: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly chunks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly emitters: Phaser.GameObjects.Particles.ParticleEmitter[];
  private readonly loose = new Set<Phaser.GameObjects.GameObject>();
  /** Frame-stepping counters: they target no object, so `clear` must stop them by hand. */
  private readonly anims = new Set<Phaser.Tweens.Tween>();

  constructor(private scene: Phaser.Scene, private layer: Phaser.GameObjects.Container) {
    this.bits = scene.add.particles(0, 0, "px-dot", { emitting: false, lifespan: { min: 220, max: 520 }, speed: { min: 30, max: 120 }, gravityY: 160 });
    this.chunks = scene.add.particles(0, 0, "px-dot2", { emitting: false, lifespan: { min: 500, max: 900 }, speed: { min: 20, max: 80 }, angle: { min: 200, max: 340 }, gravityY: 180 });
    this.emitters = [this.bits, this.chunks];
    layer.add(this.emitters);
  }

  setSpeed(s: number): void {
    this.emitters.forEach((e) => (e.timeScale = s));
  }

  /** Plays effect `id` once at (x, y) and removes it; returns the image for extra tweening. */
  play(id: FxId, x: number, y: number, o: PlayOpts = {}): Phaser.GameObjects.Image {
    const sheet = FX[id];
    const img = this.scene.add.image(Math.round(x), Math.round(y), fxKey(id, 0)).setOrigin(0.5, o.anchor === "bottom" ? 1 : 0.5).setFlipX(!!o.flipX);
    if (o.tint !== undefined) img.setTint(o.tint);
    if (o.add) img.setBlendMode(Phaser.BlendModes.ADD);
    if (o.depthBehind) this.layer.addAt(img, Math.max(0, this.layer.getIndex(o.depthBehind)));
    else this.layer.add(img);
    this.loose.add(img);
    const n = sheet.frames.length;
    const fps = o.fps ?? 18;
    const total = (n / fps) * 1000 + (o.hold ?? 0);
    this.anims.add(this.scene.tweens.addCounter({ from: 0, to: 1, duration: total, onUpdate: (tw) => {
      const i = Math.min(n - 1, Math.floor(((tw.getValue() ?? 0) * total * fps) / 1000));
      if (img.active) img.setTexture(fxKey(id, i));
    }, onComplete: () => this.drop(img) }));
    return img;
  }

  /** Keeps effect `id` on screen on its last frame until `drop` (fences, pillars, runes). */
  stay(id: FxId, x: number, y: number, o: PlayOpts = {}): Phaser.GameObjects.Image {
    const sheet = FX[id];
    const img = this.scene.add.image(Math.round(x), Math.round(y), fxKey(id, 0)).setOrigin(0.5, o.anchor === "bottom" ? 1 : 0.5).setFlipX(!!o.flipX);
    if (o.tint !== undefined) img.setTint(o.tint);
    if (o.add) img.setBlendMode(Phaser.BlendModes.ADD);
    if (o.depthBehind) this.layer.addAt(img, Math.max(0, this.layer.getIndex(o.depthBehind)));
    else this.layer.add(img);
    this.loose.add(img);
    const n = sheet.frames.length;
    const fps = o.fps ?? 14;
    const frameAt = (tw: Phaser.Tweens.Tween): void => {
      if (img.active) img.setTexture(fxKey(id, Math.round(tw.getValue() ?? 0)));
    };
    if (n > 1) this.anims.add(this.scene.tweens.addCounter({ from: 0, to: n - 1, duration: ((n - 1) / fps) * 1000, onUpdate: frameAt }));
    return img;
  }

  /** Flickers an effect out and removes it. */
  fadeOut(img: Phaser.GameObjects.Image, ms = 240): void {
    this.scene.tweens.add({ targets: img, alpha: 0, duration: ms, ease: "Stepped", easeParams: [4], onComplete: () => this.drop(img) });
  }

  private drop(img: Phaser.GameObjects.Image): void {
    this.loose.delete(img);
    if (img.active) img.destroy();
  }

  /** A burst of single pixels. */
  bitsAt(x: number, y: number, tint: number | number[], count: number): void {
    this.bits.setParticleTint(Array.isArray(tint) ? tint[0] : tint);
    this.bits.explode(count, x, y);
    if (Array.isArray(tint) && tint[1] !== undefined) {
      this.bits.setParticleTint(tint[1]);
      this.bits.explode(Math.round(count / 2), x, y);
    }
  }

  /** 2x2 fragments flung up and falling: a body breaking apart. */
  chunksAt(x: number, y: number, tint: number, count: number): void {
    this.chunks.setParticleTint(tint);
    this.chunks.explode(count, x, y);
  }

  /** Ground dust where something lands. */
  dust(x: number, big: boolean): void {
    this.play("dust", x - 6, FLOOR_Y - 3, { fps: 14 });
    this.play("dust", x + 6, FLOOR_Y - 3, { fps: 14, flipX: true });
    if (big) this.play("ring", x, FLOOR_Y, { fps: 16 });
  }

  /** Pixel motes drawn in towards (x, y): power gathering. */
  gather(x: number, y: number, tint: number, count: number, ms: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = 22 + (i % 3) * 8;
      const dot = this.scene.add.image(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), i % 2 ? "px-dot2" : "px-dot").setTint(tint);
      this.layer.add(dot);
      this.loose.add(dot);
      this.scene.tweens.add({ targets: dot, x, y, duration: ms * (0.7 + (i % 4) * 0.1), ease: "Cubic.In", onComplete: () => this.drop(dot) });
    }
  }

  /** A column of holy light falling on x: the beam slice tiled from the top of the screen to the floor. */
  beam(x: number, ms: number): void {
    const sheet = FX.beam;
    const col = this.scene.add.tileSprite(Math.round(x), FLOOR_Y, sheet.w, FLOOR_Y, fxKey("beam", 0)).setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff2b0);
    col.setScale(0.25, 1);
    this.layer.add(col);
    this.loose.add(col);
    this.scene.tweens.add({ targets: col, scaleX: 1, duration: ms * 0.25, ease: "Stepped", easeParams: [3] });
    this.scene.tweens.add({ targets: col, tilePositionY: -sheet.h * 12, duration: ms, ease: "Linear" });
    this.scene.tweens.add({ targets: col, alpha: 0, scaleX: 1.5, delay: ms * 0.7, duration: ms * 0.3, ease: "Stepped", easeParams: [3], onComplete: () => {
      this.loose.delete(col);
      col.destroy();
    } });
  }

  clear(): void {
    this.anims.forEach((t) => t.remove());
    this.anims.clear();
    this.emitters.forEach((e) => e.killAll());
    this.loose.forEach((o) => {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    });
    this.loose.clear();
  }
}
