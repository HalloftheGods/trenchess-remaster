import Phaser from "phaser";
import { paint } from "../art/canvas";

type G = CanvasRenderingContext2D;

/** Effect textures, painted once at boot of the first duel. */
export const FX = {
  shadow: "dfx-shadow",
  spark: "dfx-spark",
  soft: "dfx-soft",
  shard: "dfx-shard",
  ring: "dfx-ring",
  slash: "dfx-slash",
  star: "dfx-star",
  beam: "dfx-beam",
  streak: "dfx-streak",
  pillar: "dfx-pillar",
  bar: "dfx-bar",
  rune: "dfx-rune",
  mote: "dfx-mote",
  leaf: "dfx-leaf",
  puff: "dfx-puff",
} as const;

const radial = (g: G, x: number, y: number, r: number, stops: [number, string][]): void => {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([o, c]) => grad.addColorStop(o, c));
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
};

const PAINTERS: Record<keyof typeof FX, [number, number, (g: G) => void]> = {
  shadow: [128, 128, (g) => radial(g, 64, 64, 64, [[0, "rgba(0,0,0,0.75)"], [0.6, "rgba(0,0,0,0.35)"], [1, "rgba(0,0,0,0)"]])],
  spark: [32, 32, (g) => radial(g, 16, 16, 16, [[0, "rgba(255,255,255,1)"], [0.25, "rgba(255,255,255,0.85)"], [1, "rgba(255,255,255,0)"]])],
  soft: [128, 128, (g) => radial(g, 64, 64, 64, [[0, "rgba(255,255,255,0.9)"], [0.5, "rgba(255,255,255,0.35)"], [1, "rgba(255,255,255,0)"]])],
  mote: [16, 16, (g) => radial(g, 8, 8, 8, [[0, "rgba(255,255,255,1)"], [0.5, "rgba(255,255,255,0.6)"], [1, "rgba(255,255,255,0)"]])],
  shard: [24, 24, (g) => {
    g.beginPath();
    g.moveTo(12, 0);
    g.lineTo(22, 15);
    g.lineTo(9, 24);
    g.lineTo(2, 10);
    g.closePath();
    g.fillStyle = "#ffffff";
    g.fill();
    g.fillStyle = "rgba(0,0,0,0.28)";
    g.beginPath();
    g.moveTo(12, 0);
    g.lineTo(22, 15);
    g.lineTo(12, 12);
    g.closePath();
    g.fill();
  }],
  leaf: [20, 12, (g) => {
    g.beginPath();
    g.ellipse(10, 6, 9, 4.5, 0.2, 0, Math.PI * 2);
    g.fillStyle = "#ffffff";
    g.fill();
    g.strokeStyle = "rgba(0,0,0,0.3)";
    g.beginPath();
    g.moveTo(2, 6);
    g.lineTo(18, 6);
    g.stroke();
  }],
  puff: [96, 96, (g) => {
    [[48, 56, 30], [28, 60, 22], [68, 60, 22], [48, 40, 24]].forEach(([x, y, r]) => radial(g, x, y, r, [[0, "rgba(255,255,255,0.9)"], [0.7, "rgba(255,255,255,0.6)"], [1, "rgba(255,255,255,0)"]]));
  }],
  ring: [256, 256, (g) => {
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(128, 128, 112 - i * 4, 0, Math.PI * 2);
      g.strokeStyle = `rgba(255,255,255,${0.9 - i * 0.3})`;
      g.lineWidth = 10 - i * 3;
      g.stroke();
    }
    radial(g, 128, 128, 128, [[0, "rgba(255,255,255,0)"], [0.7, "rgba(255,255,255,0.05)"], [0.9, "rgba(255,255,255,0.3)"], [1, "rgba(255,255,255,0)"]]);
  }],
  slash: [256, 256, (g) => {
    for (let i = 0; i < 18; i++) {
      const t = i / 17;
      g.beginPath();
      g.arc(128, 128, 104 - t * 26, Math.PI * (1.05 + t * 0.12), Math.PI * (1.95 - t * 0.05));
      g.strokeStyle = `rgba(255,255,255,${(1 - t) * 0.5})`;
      g.lineWidth = 3 + (1 - t) * 6;
      g.lineCap = "round";
      g.stroke();
    }
    g.beginPath();
    g.arc(128, 128, 104, Math.PI * 1.08, Math.PI * 1.92);
    g.strokeStyle = "#ffffff";
    g.lineWidth = 5;
    g.stroke();
  }],
  star: [128, 128, (g) => {
    radial(g, 64, 64, 30, [[0, "rgba(255,255,255,1)"], [1, "rgba(255,255,255,0)"]]);
    g.fillStyle = "#ffffff";
    for (const [w, h] of [[64, 3], [3, 64]]) {
      g.beginPath();
      g.ellipse(64, 64, w, h, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 0.5;
    g.save();
    g.translate(64, 64);
    g.rotate(Math.PI / 4);
    for (const [w, h] of [[36, 2], [2, 36]]) {
      g.beginPath();
      g.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }],
  beam: [128, 512, (g) => {
    const grad = g.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.3, "rgba(255,255,255,0.35)");
    grad.addColorStop(0.5, "rgba(255,255,255,1)");
    grad.addColorStop(0.7, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 512);
    const fade = g.createLinearGradient(0, 0, 0, 512);
    fade.addColorStop(0, "rgba(0,0,0,1)");
    fade.addColorStop(0.85, "rgba(0,0,0,0)");
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = fade;
    g.globalAlpha = 0.6;
    g.fillRect(0, 0, 128, 512);
  }],
  streak: [512, 256, (g) => {
    let s = 7;
    const rnd = (): number => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 70; i++) {
      const y = rnd() * 256;
      const x = rnd() * 512;
      const len = 60 + rnd() * 200;
      const grad = g.createLinearGradient(x, 0, x + len, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, `rgba(255,255,255,${0.25 + rnd() * 0.5})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      for (const dx of [0, -512]) g.fillRect(x + dx, y, len, 1 + rnd() * 2.5);
    }
  }],
  pillar: [64, 200, (g) => {
    const grad = g.createLinearGradient(8, 0, 56, 0);
    grad.addColorStop(0, "#d8dce8");
    grad.addColorStop(0.45, "#8e93a6");
    grad.addColorStop(1, "#3e4152");
    g.beginPath();
    g.moveTo(32, 0);
    g.lineTo(54, 60);
    g.lineTo(60, 200);
    g.lineTo(4, 200);
    g.lineTo(12, 64);
    g.closePath();
    g.fillStyle = grad;
    g.fill();
    g.strokeStyle = "rgba(16,10,26,0.9)";
    g.lineWidth = 3;
    g.stroke();
    g.strokeStyle = "rgba(255,240,180,0.9)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(30, 20);
    g.lineTo(26, 70);
    g.lineTo(34, 110);
    g.lineTo(28, 170);
    g.stroke();
  }],
  bar: [140, 110, (g) => {
    const post = (x: number, h: number): void => {
      g.fillStyle = "#e9e2cf";
      g.fillRect(x, 110 - h, 7, h);
      g.strokeStyle = "rgba(16,10,26,0.9)";
      g.lineWidth = 2;
      g.strokeRect(x, 110 - h, 7, h);
    };
    [[8, 46], [62, 72], [116, 98]].forEach(([x, h]) => {
      post(x - 6, h + 6);
      post(x + 14, h + 6);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = i % 2 ? "#c23a3a" : "#f4efe2";
        g.fillRect(x - 6 + i * 7, 110 - h, 7, 5);
      }
      g.strokeStyle = "rgba(16,10,26,0.9)";
      g.strokeRect(x - 6, 110 - h, 27, 5);
    });
  }],
  rune: [512, 160, (g) => {
    g.translate(256, 80);
    g.scale(1, 0.3);
    g.strokeStyle = "rgba(255,226,140,0.95)";
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(0, -240);
    g.lineTo(240, 0);
    g.lineTo(0, 240);
    g.lineTo(-240, 0);
    g.closePath();
    g.stroke();
    g.lineWidth = 5;
    g.beginPath();
    g.arc(0, 0, 160, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(-240, 0);
    g.lineTo(240, 0);
    g.moveTo(0, -240);
    g.lineTo(0, 240);
    g.stroke();
  }],
};

export const paintDuelFx = (scene: Phaser.Scene): void => {
  (Object.keys(FX) as (keyof typeof FX)[]).forEach((id) => {
    const [w, h, draw] = PAINTERS[id];
    paint(scene, FX[id], w, h, (g) => draw(g));
  });
};

/**
 * Particle bursts and one-shot effects for a duel, all inside the stage's world container.
 * Sizes are in rig units scaled by `k`, so effects match the fighters at any screen size.
 */
export class DuelFx {
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly shards: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly emitters: Phaser.GameObjects.Particles.ParticleEmitter[];
  private readonly loose: Phaser.GameObjects.GameObject[] = [];

  constructor(private scene: Phaser.Scene, private layer: Phaser.GameObjects.Container, private k: number) {
    const u = k;
    this.sparks = scene.add.particles(0, 0, FX.spark, { emitting: false, lifespan: { min: 260, max: 620 }, speed: { min: 60 * u, max: 230 * u }, gravityY: 150 * u, scale: { start: 0.22 * u, end: 0 }, blendMode: Phaser.BlendModes.ADD });
    this.dust = scene.add.particles(0, 0, FX.puff, { emitting: false, lifespan: { min: 500, max: 1000 }, speedX: { min: -40 * u, max: 40 * u }, speedY: { min: -18 * u, max: -4 * u }, scale: { start: 0.12 * u, end: 0.32 * u }, alpha: { start: 0.55, end: 0 }, rotate: { min: 0, max: 360 } });
    this.shards = scene.add.particles(0, 0, FX.shard, { emitting: false, lifespan: { min: 600, max: 1100 }, speed: { min: 60 * u, max: 200 * u }, angle: { min: 190, max: 350 }, gravityY: 300 * u, scale: { min: 0.08 * u, max: 0.2 * u }, rotate: { start: 0, end: 540 }, alpha: { start: 1, end: 0 } });
    this.emitters = [this.sparks, this.dust, this.shards];
    layer.add(this.emitters);
  }

  /** Everything the effects run on obeys the duel clock: slow motion and hit-stop included. */
  setSpeed(s: number): void {
    this.emitters.forEach((e) => (e.timeScale = s));
  }

  sparksAt(x: number, y: number, tint: number, count: number): void {
    this.sparks.setParticleTint(tint);
    this.sparks.explode(count, x, y);
  }

  dustAt(x: number, y: number, tint: number, count: number): void {
    this.dust.setParticleTint(tint);
    this.dust.explode(count, x, y);
  }

  shardsAt(x: number, y: number, tint: number, count: number): void {
    this.shards.setParticleTint(tint);
    this.shards.explode(count, x, y);
  }

  private image(key: string, x: number, y: number, tint: number, add = true): Phaser.GameObjects.Image {
    const img = this.scene.add.image(x, y, key).setTint(tint);
    if (add) img.setBlendMode(Phaser.BlendModes.ADD);
    this.layer.add(img);
    this.loose.push(img);
    return img;
  }

  private fade(img: Phaser.GameObjects.Image, cfg: Omit<Phaser.Types.Tweens.TweenBuilderConfig, "targets">): void {
    this.scene.tweens.add({ targets: img, ...cfg, onComplete: () => img.destroy() });
  }

  /** A crescent of light along a swing: `angle` in degrees, `flip` mirrors it for left-facing rigs. */
  slash(x: number, y: number, angle: number, flip: boolean, tint: number, size: number): void {
    const s = (size * this.k) / 100;
    const img = this.image(FX.slash, x, y, tint).setAngle(angle).setScale(s * 0.6).setFlipX(flip).setAlpha(1);
    this.fade(img, { scale: s * 1.1, alpha: 0, duration: 280, ease: "Cubic.Out" });
  }

  /** An expanding shock ring, flattened to sit on the floor when `ground`. */
  ring(x: number, y: number, tint: number, size: number, ground: boolean): void {
    const s = (size * this.k) / 112;
    const img = this.image(FX.ring, x, y, tint).setScale(s * 0.2, s * (ground ? 0.06 : 0.2));
    this.fade(img, { scaleX: s, scaleY: s * (ground ? 0.28 : 1), alpha: 0, duration: 420, ease: "Cubic.Out" });
  }

  /** A four-point flare: impacts and glints. */
  star(x: number, y: number, tint: number, size: number, ms = 320): void {
    const s = (size * this.k) / 64;
    const img = this.image(FX.star, x, y, tint).setScale(s * 0.3).setAngle(Phaser.Math.Between(-12, 12));
    this.fade(img, { scale: s, alpha: 0, angle: img.angle + 30, duration: ms, ease: "Quad.Out" });
  }

  /** A soft glow that swells and fades: charge-ups and auras. */
  glow(x: number, y: number, tint: number, size: number, ms: number): Phaser.GameObjects.Image {
    const s = (size * this.k) / 64;
    const img = this.image(FX.soft, x, y, tint).setScale(s * 0.4).setAlpha(0);
    this.fade(img, { scale: s, alpha: { from: 0.9, to: 0 }, duration: ms, ease: "Sine.Out" });
    return img;
  }

  /** Motes drawn in from all around towards (x, y): gathering power. */
  gather(x: number, y: number, tint: number, count: number, ms: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const r = (40 + Math.random() * 50) * this.k;
      const img = this.image(FX.spark, x + Math.cos(a) * r, y + Math.sin(a) * r, tint).setScale(0.12 * this.k).setAlpha(0);
      this.fade(img, { x, y, alpha: { from: 1, to: 0.2 }, scale: 0.04 * this.k, duration: ms * (0.7 + Math.random() * 0.3), delay: Math.random() * ms * 0.25, ease: "Cubic.In" });
    }
  }

  /** A column of light dropping onto (x, floor). */
  beam(x: number, floor: number, tint: number, width: number, ms: number): void {
    const img = this.image(FX.beam, x, floor, tint).setOrigin(0.5, 1);
    const h = floor + 40 * this.k;
    img.setDisplaySize(width * this.k * 0.2, h).setAlpha(0);
    this.scene.tweens.add({ targets: img, displayWidth: width * this.k, alpha: 1, duration: ms * 0.3, ease: "Quad.Out" });
    this.fade(img, { alpha: 0, displayWidth: width * this.k * 1.6, delay: ms * 0.7, duration: ms * 0.5 });
  }

  /** A stone spike bursting out of the floor at x and crumbling back. */
  pillar(x: number, floor: number, tint: number, size: number, ms: number): void {
    const h = size * this.k;
    const img = this.image(FX.pillar, x, floor + 2 * this.k, tint, false).setOrigin(0.5, 1).setDisplaySize(h * 0.32, 1);
    this.scene.tweens.add({ targets: img, displayHeight: h, duration: 110, ease: "Back.Out" });
    this.fade(img, { alpha: 0, y: floor + h * 0.4, delay: ms, duration: 260, ease: "Quad.In" });
    this.dustAt(x, floor, 0xc8c0b0, 6);
  }

  /** The glowing four-cornered rune the Twilight Fortress stamps around its foe. */
  rune(x: number, floor: number, tint: number, size: number, ms: number): void {
    const s = (size * this.k) / 512;
    const img = this.image(FX.rune, x, floor, tint).setScale(s * 0.3).setAlpha(0);
    this.scene.tweens.add({ targets: img, scale: s, alpha: 1, duration: 180, ease: "Back.Out" });
    this.fade(img, { alpha: 0, delay: ms, duration: 300 });
  }

  /** The triple bar fence the Shadow Knight clears, standing at (x, floor). */
  fence(x: number, floor: number, size: number, flip: boolean): Phaser.GameObjects.Image {
    const img = this.image(FX.bar, x, floor, 0xffffff, false).setOrigin(0.5, 1).setFlipX(flip);
    img.setDisplaySize(size * this.k * 1.27, size * this.k).setAlpha(0);
    this.scene.tweens.add({ targets: img, alpha: 0.95, duration: 140 });
    return img;
  }

  dropFence(img: Phaser.GameObjects.Image): void {
    this.fade(img, { alpha: 0, y: img.y + 6 * this.k, duration: 300, ease: "Quad.In" });
  }

  /** Clears every effect at once (a skip lands on the result). */
  clear(): void {
    this.emitters.forEach((e) => e.killAll());
    this.loose.splice(0).forEach((o) => {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    });
  }
}
