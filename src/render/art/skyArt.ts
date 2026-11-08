import Phaser from "phaser";
import { ellipse, paint, radial, rand } from "./canvas";
import type { SkySpec } from "./worlds/recipe";
import { recipe, world } from "./worlds/registry";

/** Sky dome, distant peaks and a star tile for the active world, painted once per world. */

export const SKY_W = 1024;
export const SKY_H = 512;
export const PEAKS_W = 2048;
export const PEAKS_H = 160;
export const STARS = 256;

export type SkyPart = "dome" | "peaks" | "stars";

export const skyKey = (part: SkyPart): string => `sky-${world.id}-${part}`;

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const aurora = (g: CanvasRenderingContext2D, w: number, h: number, color: string, r: () => number): void => {
  g.save();
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) {
    const x = w * (0.1 + i * 0.2) + (r() - 0.5) * 80;
    const top = h * (0.05 + r() * 0.15);
    const bottom = h * (0.45 + r() * 0.15);
    const curtain = g.createLinearGradient(0, top, 0, bottom);
    curtain.addColorStop(0, rgba(color, 0));
    curtain.addColorStop(0.4, rgba(color, 0.22));
    curtain.addColorStop(1, rgba(color, 0));
    g.fillStyle = curtain;
    g.beginPath();
    g.moveTo(x - 60, top);
    g.quadraticCurveTo(x + 40, (top + bottom) / 2, x - 20, bottom);
    g.lineTo(x + 70, bottom);
    g.quadraticCurveTo(x + 120, (top + bottom) / 2, x + 50, top);
    g.closePath();
    g.fill();
  }
  g.restore();
};

const dome = (spec: SkySpec) => (g: CanvasRenderingContext2D, w: number, h: number): void => {
  const sky = g.createLinearGradient(0, 0, 0, h);
  spec.stops.forEach(([o, c]) => sky.addColorStop(o, c));
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  if (spec.aurora) aurora(g, w, h, spec.aurora, rand(777));
  if (spec.sun) {
    const sx = w * spec.sun.x;
    const sy = h * spec.sun.y;
    const rad = w * spec.sun.spread;
    const glow = spec.sun.glow;
    ellipse(g, sx, sy, rad, h * 0.5, radial(g, sx, sy, rad, [[0, rgba(glow, 0.75)], [0.25, rgba(glow, 0.35)], [0.6, rgba(glow, 0.08)], [1, rgba(glow, 0)]]));
    ellipse(g, sx, sy, 26, 26, radial(g, sx, sy, 26, [[0, spec.sun.core], [0.5, rgba(spec.sun.core, 0.9)], [1, rgba(glow, 0)]]));
  }
  const haze = g.createLinearGradient(0, h * 0.78, 0, h);
  haze.addColorStop(0, "rgba(255,255,255,0)");
  haze.addColorStop(1, spec.haze);
  g.fillStyle = haze;
  g.fillRect(0, h * 0.78, w, h * 0.22);
};

const ridge = (g: CanvasRenderingContext2D, w: number, h: number, base: number, amp: number, step: number, color: string, r: () => number): void => {
  g.beginPath();
  g.moveTo(0, h);
  g.lineTo(0, base);
  let x = 0;
  while (x < w) {
    const peak = base - amp * (0.35 + r() * 0.65);
    const half = step * (0.5 + r() * 0.5);
    g.lineTo(x + half * 0.5, peak);
    g.lineTo(x + half, base - amp * 0.1 * r());
    x += half;
  }
  g.lineTo(w, h);
  g.closePath();
  g.fillStyle = color;
  g.fill();
};

const peaks = (spec: SkySpec) => (g: CanvasRenderingContext2D, w: number, h: number): void => {
  const r = rand(4242);
  const [far, mid, near, fadeHex] = spec.peaks;
  ridge(g, w, h, h * 0.8, h * 0.62, 170, far, r);
  ridge(g, w, h, h * 0.88, h * 0.48, 120, mid, r);
  ridge(g, w, h, h * 0.96, h * 0.3, 90, near, r);
  const fade = g.createLinearGradient(0, h * 0.4, 0, h);
  fade.addColorStop(0, rgba(fadeHex, 0));
  fade.addColorStop(1, rgba(fadeHex, 0.45));
  g.fillStyle = fade;
  g.fillRect(0, 0, w, h);
};

const stars = (spec: SkySpec) => (g: CanvasRenderingContext2D, w: number, h: number): void => {
  const r = rand(9001);
  for (let i = 0; i < spec.stars; i++) {
    const x = r() * w;
    const y = r() * h;
    const big = r() > 0.88;
    const rad = big ? 1.6 + r() : 0.6 + r() * 0.6;
    const a = 0.35 + r() * 0.65;
    if (big) ellipse(g, x, y, rad * 4, rad * 4, radial(g, x, y, rad * 4, [[0, `rgba(200,220,255,${a * 0.5})`], [1, "rgba(200,220,255,0)"]]));
    ellipse(g, x, y, rad, rad, rgba(spec.starColor, a));
  }
};

export const paintSky = (scene: Phaser.Scene): void => {
  const spec = recipe().sky;
  paint(scene, skyKey("dome"), SKY_W, SKY_H, dome(spec));
  paint(scene, skyKey("peaks"), PEAKS_W, PEAKS_H, peaks(spec));
  paint(scene, skyKey("stars"), STARS, STARS, stars(spec));
  paint(scene, "light-warm", 256, 256, (g) => ellipse(g, 128, 128, 128, 128, radial(g, 128, 128, 128, [[0, "rgba(255,214,150,0.55)"], [0.5, "rgba(255,200,130,0.18)"], [1, "rgba(255,200,130,0)"]])));
};
