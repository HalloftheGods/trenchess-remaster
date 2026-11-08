import type { Faction } from "../unitArt";
import { ellipse, radial } from "../canvas";

export type G = CanvasRenderingContext2D;

export const X = 32;

export interface Metal {
  light: string;
  base: string;
  dark: string;
}

export const BRASS: Metal = { light: "#fff3c2", base: "#d2a73b", dark: "#6a4a10" };
export const COPPER: Metal = { light: "#f7bc93", base: "#b56a3a", dark: "#4f2912" };
export const STEEL: Metal = { light: "#eef1f5", base: "#9aa3ad", dark: "#3f464f" };
export const INK = "rgba(40,24,4,0.75)";
export const GLASS = { rim: "#dff8ff", mid: "#49a8dd", deep: "#0b2740" };

export const alpha = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const metal = (g: G, m: Metal, x0: number, x1: number): CanvasGradient => {
  const lg = g.createLinearGradient(x0, 0, x1, 0);
  lg.addColorStop(0, m.light);
  lg.addColorStop(0.3, m.base);
  lg.addColorStop(0.75, m.dark);
  lg.addColorStop(1, m.base);
  return lg;
};

/** Enamel in the army colour: glossy, lit from the upper-left. */
export const enamel = (g: G, f: Faction, x0: number, x1: number): CanvasGradient => {
  const lg = g.createLinearGradient(x0, 0, x1, 0);
  lg.addColorStop(0, f.light);
  lg.addColorStop(0.35, f.base);
  lg.addColorStop(1, f.dark);
  return lg;
};

export const poly = (g: G, pts: number[], fill: string | CanvasGradient, stroke = INK, lw = 1.1): void => {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (lw <= 0) return;
  g.strokeStyle = stroke;
  g.lineWidth = lw;
  g.stroke();
};

export const line = (g: G, x0: number, y0: number, x1: number, y1: number, color: string, w: number): void => {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
};

export const rect = (g: G, x: number, y: number, w: number, h: number, fill: string | CanvasGradient, r = 1.5): void => {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
};

export const rivets = (g: G, pts: number[], r = 1): void => {
  for (let i = 0; i < pts.length; i += 2) {
    ellipse(g, pts[i] + 0.4, pts[i + 1] + 0.4, r, r, INK);
    ellipse(g, pts[i], pts[i + 1], r, r, BRASS.light);
  }
};

/** Toothed gear seen flat or in perspective (ry < rx). */
export const gear = (g: G, x: number, y: number, rx: number, ry: number, teeth: number, m: Metal, hub?: string): void => {
  const pts: number[] = [];
  const n = teeth * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const k = i % 2 === 0 ? 1 : 0.8;
    pts.push(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k);
    const a2 = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
    pts.push(x + Math.cos(a2) * rx * k, y + Math.sin(a2) * ry * k);
  }
  poly(g, pts, metal(g, m, x - rx, x + rx), INK, 1);
  ellipse(g, x, y, rx * 0.55, ry * 0.55, m.dark);
  ellipse(g, x, y, rx * 0.42, ry * 0.42, hub ?? metal(g, m, x - rx, x + rx));
  ellipse(g, x, y, rx * 0.14, ry * 0.14, INK);
};

/** Glass lens with a brass bezel and an upper-left highlight. */
export const lens = (g: G, x: number, y: number, r: number): void => {
  ellipse(g, x, y, r + 2, r + 2, metal(g, BRASS, x - r, x + r));
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(x, y, r + 2, 0, Math.PI * 2);
  g.stroke();
  ellipse(g, x, y, r, r, radial(g, x + r * 0.2, y + r * 0.2, r * 1.2, [[0, GLASS.mid], [0.6, GLASS.deep], [1, "#040c16"]]));
  ellipse(g, x, y, r * 0.35, r * 0.35, GLASS.rim);
  ellipse(g, x - r * 0.45, y - r * 0.45, r * 0.3, r * 0.2, "rgba(255,255,255,0.8)");
};

/** Pressure gauge: white dial, ticks, a red zone and a needle. */
export const gauge = (g: G, x: number, y: number, r: number, needle: number): void => {
  ellipse(g, x, y, r + 1.5, r + 1.5, metal(g, BRASS, x - r, x + r));
  ellipse(g, x, y, r, r, "#f4efdf");
  g.strokeStyle = "#c93b2a";
  g.lineWidth = r * 0.25;
  g.beginPath();
  g.arc(x, y, r * 0.82, -Math.PI * 0.35, Math.PI * 0.05);
  g.stroke();
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.85 + (i / 6) * Math.PI * 1.3;
    line(g, x + Math.cos(a) * r * 0.65, y + Math.sin(a) * r * 0.65, x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, "#333", 0.8);
  }
  line(g, x, y, x + Math.cos(needle) * r * 0.85, y + Math.sin(needle) * r * 0.85, "#1a1a1a", 1.2);
  ellipse(g, x, y, r * 0.18, r * 0.18, BRASS.dark);
};

export const puff = (g: G, x: number, y: number, r: number, a = 0.8): void => {
  ellipse(g, x, y, r, r, radial(g, x - r * 0.3, y - r * 0.3, r, [[0, `rgba(255,255,255,${a})`], [0.7, `rgba(225,232,240,${a * 0.7})`], [1, "rgba(200,210,220,0)"]]));
};

/** Electric arc: a jagged glowing line. */
export const spark = (g: G, x0: number, y0: number, x1: number, y1: number, seed: number): void => {
  const pts = [x0, y0];
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    const j = Math.sin(seed * 7.3 + i * 2.1) * 2.2;
    pts.push(x0 + (x1 - x0) * t + j, y0 + (y1 - y0) * t - j);
  }
  pts.push(x1, y1);
  g.save();
  g.shadowColor = "#7fe9ff";
  g.shadowBlur = 6;
  g.strokeStyle = "#cdf6ff";
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.stroke();
  g.restore();
};

/** A brass gear-plate footing with an enamel ring in the army colour. */
export const plate = (g: G, f: Faction): void => {
  ellipse(g, X, 90, 21, 7, BRASS.dark);
  gear(g, X, 87, 21, 7, 18, BRASS);
  ellipse(g, X, 87, 15, 5, metal(g, BRASS, X - 15, X + 15));
  ellipse(g, X, 87, 12.5, 4, enamel(g, f, X - 12, X + 12));
  ellipse(g, X, 87, 9, 2.8, metal(g, BRASS, X - 9, X + 9));
};
