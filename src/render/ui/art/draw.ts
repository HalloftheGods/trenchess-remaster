import { radial } from "../../art/canvas";

export type Ctx = CanvasRenderingContext2D;

export const roundRect = (g: Ctx, x: number, y: number, w: number, h: number, r: number): void => {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
};

export const vertical = (g: Ctx, y0: number, y1: number, stops: [number, string][]): CanvasGradient => {
  const grad = g.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => grad.addColorStop(o, c));
  return grad;
};

export const diagonal = (g: Ctx, w: number, h: number, stops: [number, string][]): CanvasGradient => {
  const grad = g.createLinearGradient(0, 0, w, h);
  stops.forEach(([o, c]) => grad.addColorStop(o, c));
  return grad;
};

/** A small domed rivet with a highlight, used on panel and button corners. */
export const rivet = (g: Ctx, x: number, y: number, r: number): void => {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = radial(g, x - r * 0.35, y - r * 0.35, r * 1.4, [
    [0, "#fff1b8"],
    [0.35, "#d9a93a"],
    [1, "#5a3d10"],
  ]);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.55)";
  g.lineWidth = 1;
  g.stroke();
};

/** Soft brushed-metal streaks across a rectangle. */
export const brushed = (g: Ctx, x: number, y: number, w: number, h: number, seed: number, alpha: number): void => {
  let s = seed;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  g.save();
  g.globalAlpha = alpha;
  for (let i = 0; i < h; i += 2) {
    g.fillStyle = next() > 0.5 ? "#ffffff" : "#000000";
    g.fillRect(x, y + i, w, 1);
  }
  g.restore();
};

/** Gold rim stroke: a bright inner line over a darker outer line. */
export const goldRim = (g: Ctx, x: number, y: number, w: number, h: number, r: number, width: number): void => {
  roundRect(g, x, y, w, h, r);
  g.strokeStyle = "#6a4a12";
  g.lineWidth = width + 1.5;
  g.stroke();
  roundRect(g, x, y, w, h, r);
  g.strokeStyle = vertical(g, y, y + h, [
    [0, "#ffe9a8"],
    [0.5, "#f2c94c"],
    [1, "#b4821c"],
  ]);
  g.lineWidth = width;
  g.stroke();
};
