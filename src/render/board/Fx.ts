import Phaser from "phaser";
import { TOP_LAYER } from "../iso";

export class Fx {
  constructor(private scene: Phaser.Scene) {}

  dust(x: number, y: number, count = 6, tint = 0xe8dcc0): void {
    const p = this.scene.add.particles(x, y, "dust", {
      speed: { min: 15, max: 45 },
      angle: { min: 180, max: 360 },
      scale: { start: 0.5, end: 1.1 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 520,
      tint,
      gravityY: 20,
      emitting: false,
    });
    p.setDepth(TOP_LAYER - 5);
    p.explode(count);
    this.scene.time.delayedCall(700, () => p.destroy());
  }

  shatter(x: number, y: number, color: number): void {
    const shards = this.scene.add.particles(x, y, "shard", {
      speed: { min: 90, max: 260 },
      angle: { min: 200, max: 340 },
      rotate: { min: 0, max: 360 },
      scale: { start: 1.1, end: 0.3 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 500, max: 900 },
      gravityY: 520,
      tint: [color, 0xffffff, 0xf2c94c],
      emitting: false,
    });
    const sparks = this.scene.add.particles(x, y, "spark", {
      speed: { min: 60, max: 200 },
      scale: { start: 1.4, end: 0 },
      lifespan: 420,
      blendMode: "ADD",
      emitting: false,
    });
    for (const p of [shards, sparks]) p.setDepth(TOP_LAYER);
    shards.explode(26);
    sparks.explode(18);
    this.flash(x, y, 1.6, 0xffffff);
    this.scene.time.delayedCall(1000, () => {
      shards.destroy();
      sparks.destroy();
    });
  }

  flash(x: number, y: number, scale: number, tint: number): void {
    const g = this.scene.add.image(x, y, "glow").setBlendMode("ADD").setTint(tint).setScale(0.2).setDepth(TOP_LAYER + 1);
    this.scene.tweens.add({ targets: g, scale, alpha: 0, duration: 380, ease: "Cubic.Out", onComplete: () => g.destroy() });
  }

  shockwave(x: number, y: number, tint = 0xffffff, scale = 1): void {
    const ring = this.scene.add.image(x, y, "ring").setTint(tint).setScale(0.15).setAlpha(0.9).setDepth(TOP_LAYER - 4);
    this.scene.tweens.add({ targets: ring, scale: 0.9 * scale, alpha: 0, duration: 520, ease: "Cubic.Out", onComplete: () => ring.destroy() });
  }

  sandSink(x: number, y: number): void {
    this.dust(x, y, 16, 0xe6c47c);
    this.dust(x, y - 10, 10, 0xd9b06a);
  }

  sparkle(x: number, y: number): void {
    const p = this.scene.add.particles(x, y, "spark", {
      speed: { min: 20, max: 70 },
      angle: { min: 250, max: 290 },
      scale: { start: 1.2, end: 0 },
      lifespan: 900,
      tint: [0xfff2a8, 0xffffff],
      blendMode: "ADD",
      frequency: 30,
      quantity: 2,
    });
    p.setDepth(TOP_LAYER);
    this.scene.time.delayedCall(700, () => p.stop());
    this.scene.time.delayedCall(1700, () => p.destroy());
  }

  beam(x: number, y: number, tint: number): void {
    const b = this.scene.add.image(x, y - 120, "glow").setBlendMode("ADD").setTint(tint).setScale(0.6, 6).setAlpha(0).setDepth(TOP_LAYER);
    this.scene.tweens.add({ targets: b, alpha: 0.9, duration: 220, yoyo: true, hold: 260, onComplete: () => b.destroy() });
  }

  floatText(x: number, y: number, text: string, color: string): void {
    const t = this.scene.add
      .text(x, y, text, { fontFamily: "Cinzel, Georgia, serif", fontSize: "18px", color, stroke: "#000000", strokeThickness: 4, fontStyle: "bold" })
      .setOrigin(0.5)
      .setDepth(TOP_LAYER + 2);
    this.scene.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 1300, ease: "Cubic.Out", onComplete: () => t.destroy() });
  }

  firework(x: number, y: number, color: number): void {
    const p = this.scene.add.particles(x, y, "spark", {
      speed: { min: 120, max: 300 },
      scale: { start: 1.6, end: 0 },
      lifespan: { min: 700, max: 1100 },
      gravityY: 160,
      tint: [color, 0xffffff],
      blendMode: "ADD",
      emitting: false,
    });
    p.setDepth(TOP_LAYER + 3);
    p.explode(48);
    this.flash(x, y, 2.2, color);
    this.scene.time.delayedCall(1300, () => p.destroy());
  }

  heat(x: number, y: number): void {
    const d = this.scene.add.image(x, y, "dust").setTint(0xf3dca2).setAlpha(0).setScale(0.4).setDepth(TOP_LAYER - 30);
    this.scene.tweens.add({ targets: d, y: y - 40, alpha: { from: 0.5, to: 0 }, scale: 0.9, duration: 1600, ease: "Sine.Out", onComplete: () => d.destroy() });
  }

  shake(intensity = 0.004, duration = 180): void {
    this.scene.cameras.main.shake(duration, intensity);
  }
}
