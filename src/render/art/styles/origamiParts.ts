import type { Faction } from "../unitArt";
import { ellipse } from "../canvas";

export type G = CanvasRenderingContext2D;

export const X = 32;

export type Tone = "lit" | "mid" | "shade" | "deep";

export interface Paper {
  lit: string;
  mid: string;
  shade: string;
  deep: string;
  edge: string;
  crease: string;
}

const channels = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const mix = (a: string, b: string, t: number): string => {
  const ca = channels(a);
  const cb = channels(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

const luminance = (hex: string): number => {
  const [r, g, b] = channels(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

/** The faction's paper: four facet tones plus edge and crease inks. */
export const paper = (f: Faction): Paper => {
  const bright = luminance(f.base) > 0.6;
  return {
    lit: mix(f.base, f.light, 0.6),
    mid: f.base,
    shade: mix(f.base, f.dark, 0.45),
    deep: mix(f.base, f.dark, 0.8),
    edge: bright ? "rgba(70,60,40,0.45)" : "rgba(255,255,255,0.75)",
    crease: bright ? "rgba(70,60,40,0.3)" : "rgba(255,255,255,0.45)",
  };
};

/** A flat paper facet with a paper-white (or ink, on pale paper) edge. */
export const facet = (g: G, p: Paper, tone: Tone, pts: number[]): void => {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fillStyle = p[tone];
  g.fill();
  g.strokeStyle = p.edge;
  g.lineWidth = 1;
  g.lineJoin = "round";
  g.stroke();
};

/** A crease line: lighter on lit faces, darker on shadow faces. */
export const crease = (g: G, p: Paper, x0: number, y0: number, x1: number, y1: number, onLit: boolean): void => {
  g.strokeStyle = onLit ? p.crease : "rgba(0,0,0,0.28)";
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
};

/** Two facets meeting at a vertical ridge: left lit, right in shadow. */
export const ridge = (g: G, p: Paper, left: number[], right: number[], tones: [Tone, Tone] = ["lit", "shade"]): void => {
  facet(g, p, tones[0], left);
  facet(g, p, tones[1], right);
};

/** A diamond split down the middle (heads, collars, knobs). */
export const diamond = (g: G, p: Paper, x: number, top: number, w: number, h: number, tones: [Tone, Tone] = ["lit", "shade"]): void => {
  const my = top + h * 0.45;
  ridge(g, p, [x, top, x, top + h, x - w, my], [x, top, x + w, my, x, top + h], tones);
};

/** Soft contact shadow under a piece. */
export const contact = (g: G, x: number, y: number, rx: number, ry: number): void => {
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, "rgba(0,0,0,0.35)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.save();
  g.translate(x, y);
  g.scale(1, ry / rx);
  ellipse(g, 0, 0, rx, rx, gr);
  g.restore();
};

/** A folded paper footing: a hexagonal mat with a centre crease. */
export const mat = (g: G, p: Paper): void => {
  contact(g, X, 90, 24, 8);
  facet(g, p, "mid", [X - 21, 87, X - 9, 80, X, 83, X, 94, X - 9, 94]);
  facet(g, p, "deep", [X + 21, 87, X + 9, 80, X, 83, X, 94, X + 9, 94]);
  facet(g, p, "lit", [X - 9, 80, X, 77, X + 9, 80, X, 83]);
  crease(g, p, X - 21, 87, X - 9, 94, true);
  crease(g, p, X + 21, 87, X + 9, 94, false);
};

/** Legs: a thin folded strip, lit or shaded. */
export const strip = (g: G, p: Paper, tone: Tone, x0: number, y0: number, x1: number, y1: number, w: number): void => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w * 0.5;
  const ny = (dx / len) * w * 0.5;
  facet(g, p, tone, [x0 - nx, y0 - ny, x1 - nx, y1 - ny, x1 + nx, y1 + ny, x0 + nx, y0 + ny]);
};
