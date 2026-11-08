import { ellipse, shade } from "../canvas";
import type { Rng } from "./geometry";

/** Standing decor primitives shared by the world painters (iso canvas, y grows downward). */

export const ground = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void => ellipse(g, x, y, rx, ry, "rgba(0,0,0,0.25)");

export const pine = (g: CanvasRenderingContext2D, x: number, y: number, h: number, hue: string, trunk = "#5a3b22", cap: string | null = null): void => {
  ground(g, x + 4, y + 2, h * 0.28, h * 0.1);
  g.fillStyle = trunk;
  g.fillRect(x - 1.5, y - h * 0.25, 3, h * 0.25);
  for (let i = 0; i < 3; i++) {
    const w = h * (0.34 - i * 0.07);
    const top = y - h * (0.25 + i * 0.22) - h * 0.32;
    const base = y - h * (0.18 + i * 0.22);
    const grad = g.createLinearGradient(x - w, 0, x + w, 0);
    grad.addColorStop(0, shade(hue, 0.08));
    grad.addColorStop(1, shade(hue, -0.12));
    g.beginPath();
    g.moveTo(x, top);
    g.lineTo(x + w, base);
    g.lineTo(x - w, base);
    g.closePath();
    g.fillStyle = grad;
    g.fill();
    if (cap) {
      g.beginPath();
      g.moveTo(x, top);
      g.lineTo(x + w * 0.55, top + (base - top) * 0.55);
      g.lineTo(x - w * 0.55, top + (base - top) * 0.55);
      g.closePath();
      g.fillStyle = cap;
      g.fill();
    }
  }
};

export const roundTree = (g: CanvasRenderingContext2D, x: number, y: number, h: number, hue: string, trunk = "#5e3f24"): void => {
  ground(g, x + 4, y + 2, h * 0.3, h * 0.1);
  g.fillStyle = trunk;
  g.fillRect(x - 2, y - h * 0.4, 4, h * 0.4);
  ellipse(g, x, y - h * 0.62, h * 0.3, h * 0.3, shade(hue, -0.08));
  ellipse(g, x - h * 0.08, y - h * 0.7, h * 0.22, h * 0.22, hue);
  ellipse(g, x - h * 0.12, y - h * 0.78, h * 0.1, h * 0.08, shade(hue, 0.15));
};

export interface PeakColors {
  lit: string;
  dim: string;
  cap: string | null;
}

export const peak = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: PeakColors = { lit: "#8b8174", dim: "#6c6358", cap: "#f4f6fa" }): void => {
  g.beginPath();
  g.moveTo(x - w, y);
  g.lineTo(x - w * 0.15, y - h);
  g.lineTo(x + w, y);
  g.closePath();
  g.fillStyle = c.lit;
  g.fill();
  g.beginPath();
  g.moveTo(x - w * 0.15, y - h);
  g.lineTo(x + w, y);
  g.lineTo(x + w * 0.1, y);
  g.closePath();
  g.fillStyle = c.dim;
  g.fill();
  if (!c.cap) return;
  g.beginPath();
  g.moveTo(x - w * 0.15, y - h);
  g.lineTo(x - w * 0.42, y - h * 0.68);
  g.lineTo(x - w * 0.2, y - h * 0.74);
  g.lineTo(x - w * 0.02, y - h * 0.62);
  g.lineTo(x + w * 0.22, y - h * 0.7);
  g.closePath();
  g.fillStyle = c.cap;
  g.fill();
};

export const reeds = (g: CanvasRenderingContext2D, x: number, y: number, r: Rng, hues: [string, string] = ["#7c9a3e", "#5f7d30"], head: string | null = "#6b4423"): void => {
  g.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    const dx = (r() - 0.5) * 8;
    const h = 10 + r() * 10;
    g.strokeStyle = i % 2 ? hues[0] : hues[1];
    g.beginPath();
    g.moveTo(x + dx, y);
    g.quadraticCurveTo(x + dx + 2, y - h / 2, x + dx + (r() - 0.5) * 6, y - h);
    g.stroke();
    if (i % 2 === 0 && head) ellipse(g, x + dx + 1, y - h + 2, 1.6, 3.5, head);
  }
};

export const cactus = (g: CanvasRenderingContext2D, x: number, y: number, h: number): void => {
  ground(g, x + 3, y + 1, 7, 2.5);
  g.fillStyle = "#4f8a3c";
  g.strokeStyle = "#3a6b2c";
  g.lineWidth = 1;
  const arm = (ax: number, ay: number, dir: number) => {
    g.beginPath();
    g.roundRect(ax, ay - 8, 4 * dir, 3, 1.5);
    g.roundRect(ax + 3 * dir - (dir < 0 ? 4 : 0), ay - 14, 4, 9, 2);
    g.fill();
  };
  g.beginPath();
  g.roundRect(x - 3, y - h, 6, h, 3);
  g.fill();
  g.stroke();
  arm(x + 3, y - h * 0.35, 1);
  arm(x - 3, y - h * 0.55, -1);
};

export const skull = (g: CanvasRenderingContext2D, x: number, y: number): void => {
  ellipse(g, x, y, 4, 3, "#efe6d2");
  g.fillStyle = "#3b2a1a";
  g.fillRect(x - 2, y - 1, 1.3, 1.3);
  g.fillRect(x + 0.8, y - 1, 1.3, 1.3);
};

export const boulder = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, hue: string): void => {
  ground(g, x + 2, y + 1, rx * 1.1, ry * 0.7);
  ellipse(g, x, y, rx, ry, shade(hue, -0.1));
  ellipse(g, x - rx * 0.25, y - ry * 0.3, rx * 0.5, ry * 0.45, shade(hue, 0.1));
};

