import { shade } from "../canvas";
import type { Rng } from "./geometry";
import { ground, peak } from "./shapes";

/** Built and ruined structures for the themed worlds (iso decor canvas). */

export interface TowerColors {
  wall: string;
  lit: string;
  window: string;
}

/** A boxy tower seen from the iso angle: two faces and a roof, with a window grid on each face. */
export const tower = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: TowerColors, r: Rng): void => {
  ground(g, x + 3, y + 2, w * 1.3, w * 0.5);
  const d = w * 0.5;
  g.fillStyle = shade(c.wall, -0.12);
  g.beginPath();
  g.moveTo(x - w, y - d);
  g.lineTo(x, y);
  g.lineTo(x, y - h);
  g.lineTo(x - w, y - h - d);
  g.closePath();
  g.fill();
  g.fillStyle = c.wall;
  g.beginPath();
  g.moveTo(x + w, y - d);
  g.lineTo(x, y);
  g.lineTo(x, y - h);
  g.lineTo(x + w, y - h - d);
  g.closePath();
  g.fill();
  g.fillStyle = c.lit;
  g.beginPath();
  g.moveTo(x, y - h);
  g.lineTo(x - w, y - h - d);
  g.lineTo(x, y - h - 2 * d);
  g.lineTo(x + w, y - h - d);
  g.closePath();
  g.fill();
  const rows = Math.floor(h / 6);
  for (let i = 1; i < rows; i++) {
    for (let k = 0; k < 3; k++) {
      if (r() < 0.35) continue;
      const fx = (k + 0.5) / 3;
      g.fillStyle = c.window;
      g.globalAlpha = 0.6 + r() * 0.4;
      g.fillRect(x - w * fx - 1, y - i * 6 - d * fx - 1, 2, 2.5);
      g.fillRect(x + w * fx - 1, y - i * 6 - d * fx - 1, 2, 2.5);
    }
  }
  g.globalAlpha = 1;
};

/** A glowing sign on a pole. */
export const pylon = (g: CanvasRenderingContext2D, x: number, y: number, h: number, color: string): void => {
  g.fillStyle = "#2b2f3a";
  g.fillRect(x - 1, y - h, 2, h);
  g.save();
  g.shadowColor = color;
  g.shadowBlur = 10;
  g.fillStyle = color;
  g.fillRect(x - 7, y - h - 2, 14, 7);
  g.restore();
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.fillRect(x - 5, y - h, 10, 1.5);
};

/** A charred, leafless trunk with embers at the broken top. */
export const deadTrunk = (g: CanvasRenderingContext2D, x: number, y: number, h: number, ember: string): void => {
  ground(g, x + 3, y + 1, 6, 2.5);
  g.strokeStyle = "#1b1612";
  g.lineCap = "round";
  g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + 1, y - h * 0.6);
  g.lineTo(x - 1, y - h);
  g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x + 1, y - h * 0.55);
  g.lineTo(x + 7, y - h * 0.8);
  g.moveTo(x, y - h * 0.4);
  g.lineTo(x - 6, y - h * 0.6);
  g.stroke();
  g.fillStyle = ember;
  g.fillRect(x - 1.5, y - h - 1, 3, 2);
  g.fillRect(x + 6, y - h * 0.8 - 1, 2, 2);
};

/** An obsidian shard with a glowing fissure. */
export const spire = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, glow: string): void => {
  peak(g, x, y, w, h, { lit: "#2a2630", dim: "#15121a", cap: null });
  g.strokeStyle = glow;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x - w * 0.15, y - h * 0.9);
  g.lineTo(x - w * 0.05, y - h * 0.55);
  g.lineTo(x + w * 0.15, y - h * 0.4);
  g.lineTo(x + w * 0.05, y - h * 0.12);
  g.stroke();
};

/** A flat-topped red-rock mesa with sediment bands. */
export const mesa = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void => {
  g.fillStyle = "#8f4a33";
  g.beginPath();
  g.moveTo(x - w, y);
  g.lineTo(x - w * 0.7, y - h);
  g.lineTo(x + w * 0.6, y - h);
  g.lineTo(x + w, y);
  g.closePath();
  g.fill();
  g.fillStyle = "#6d3426";
  g.beginPath();
  g.moveTo(x + w * 0.1, y);
  g.lineTo(x + w * 0.2, y - h);
  g.lineTo(x + w * 0.6, y - h);
  g.lineTo(x + w, y);
  g.closePath();
  g.fill();
  g.fillStyle = "#b5684a";
  g.beginPath();
  g.moveTo(x - w * 0.7, y - h);
  g.lineTo(x + w * 0.6, y - h);
  g.lineTo(x + w * 0.45, y - h - 4);
  g.lineTo(x - w * 0.55, y - h - 4);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(60,20,10,0.4)";
  g.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const yy = y - (h * i) / 4;
    g.beginPath();
    g.moveTo(x - w + (w * 0.3 * i) / 4, yy);
    g.lineTo(x + w - (w * 0.4 * i) / 4, yy);
    g.stroke();
  }
};

/** Mossy stepped stone: three stacked blocks. */
export const steps = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stone: string, moss: string): void => {
  ground(g, x + 4, y + 2, w * 1.2, w * 0.4);
  for (let i = 0; i < 3; i++) {
    const sw = w * (1 - i * 0.28);
    const by = y - (h * i) / 3;
    const th = h / 3;
    g.fillStyle = shade(stone, -0.14);
    g.fillRect(x - sw, by - th, sw, th);
    g.fillStyle = stone;
    g.fillRect(x, by - th, sw, th);
    g.fillStyle = shade(stone, 0.12);
    g.fillRect(x - sw, by - th - 2, sw * 2, 2.5);
    g.fillStyle = moss;
    g.fillRect(x - sw + 2, by - th - 1, sw * 0.5, 1.5);
    g.fillRect(x + sw * 0.3, by - 3, sw * 0.4, 2);
  }
};
