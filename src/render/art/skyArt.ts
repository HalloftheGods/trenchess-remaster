import Phaser from "phaser";
import { ellipse, paint, radial, rand } from "./canvas";

/** Sky dome, distant peaks and a star tile, painted once at boot. */

export const SKY_W = 1024;
export const SKY_H = 512;
export const PEAKS_W = 2048;
export const PEAKS_H = 160;
export const STARS = 256;

const dome = (g: CanvasRenderingContext2D, w: number, h: number): void => {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#05070f");
  sky.addColorStop(0.3, "#111a3a");
  sky.addColorStop(0.5, "#2c2d5c");
  sky.addColorStop(0.64, "#6a4c6c");
  sky.addColorStop(0.78, "#c47a58");
  sky.addColorStop(0.9, "#eab176");
  sky.addColorStop(1, "#f6d4a0");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  // warm sun low on the upper-left: the scene's key light
  const sx = w * 0.27;
  const sy = h * 0.86;
  ellipse(g, sx, sy, w * 0.42, h * 0.5, radial(g, sx, sy, w * 0.42, [[0, "rgba(255,214,150,0.75)"], [0.25, "rgba(255,190,120,0.35)"], [0.6, "rgba(255,160,100,0.08)"], [1, "rgba(255,160,100,0)"]]));
  ellipse(g, sx, sy, 26, 26, radial(g, sx, sy, 26, [[0, "rgba(255,250,230,1)"], [0.5, "rgba(255,236,190,0.9)"], [1, "rgba(255,220,160,0)"]]));
  // horizon haze band
  const haze = g.createLinearGradient(0, h * 0.78, 0, h);
  haze.addColorStop(0, "rgba(255,210,170,0)");
  haze.addColorStop(1, "rgba(255,225,190,0.35)");
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

const peaks = (g: CanvasRenderingContext2D, w: number, h: number): void => {
  const r = rand(4242);
  ridge(g, w, h, h * 0.8, h * 0.62, 170, "rgba(120,104,150,0.45)", r);
  ridge(g, w, h, h * 0.88, h * 0.48, 120, "rgba(84,72,118,0.7)", r);
  ridge(g, w, h, h * 0.96, h * 0.3, 90, "rgba(52,44,80,0.95)", r);
  const fade = g.createLinearGradient(0, h * 0.4, 0, h);
  fade.addColorStop(0, "rgba(240,190,150,0)");
  fade.addColorStop(1, "rgba(240,190,150,0.45)");
  g.fillStyle = fade;
  g.fillRect(0, 0, w, h);
};

const stars = (g: CanvasRenderingContext2D, w: number, h: number): void => {
  const r = rand(9001);
  for (let i = 0; i < 90; i++) {
    const x = r() * w;
    const y = r() * h;
    const big = r() > 0.88;
    const rad = big ? 1.6 + r() : 0.6 + r() * 0.6;
    const a = 0.35 + r() * 0.65;
    if (big) ellipse(g, x, y, rad * 4, rad * 4, radial(g, x, y, rad * 4, [[0, `rgba(200,220,255,${a * 0.5})`], [1, "rgba(200,220,255,0)"]]));
    ellipse(g, x, y, rad, rad, `rgba(255,255,255,${a})`);
  }
};

export const paintSky = (scene: Phaser.Scene): void => {
  paint(scene, "sky-dome", SKY_W, SKY_H, dome);
  paint(scene, "sky-peaks", PEAKS_W, PEAKS_H, peaks);
  paint(scene, "sky-stars", STARS, STARS, stars);
  paint(scene, "light-warm", 256, 256, (g) => ellipse(g, 128, 128, 128, 128, radial(g, 128, 128, 128, [[0, "rgba(255,214,150,0.55)"], [0.5, "rgba(255,200,130,0.18)"], [1, "rgba(255,200,130,0)"]])));
};
