import type { Faction } from "../unitArt";
import { ellipse, shade } from "../canvas";

export type G = CanvasRenderingContext2D;

/** Horizontal center of the 64x100 unit canvas. */
export const X = 32;

/** Natural fur colors shared by both armies (the army color lives on collars, saddles, banners and eyes). */
export interface Fur {
  light: string;
  base: string;
  dark: string;
}

export const FUR = {
  hare: { light: "#e9d2b5", base: "#b98a5a", dark: "#6e4a2a" },
  stag: { light: "#d9a877", base: "#9c6236", dark: "#54301a" },
  owl: { light: "#d9cbb3", base: "#8c7a63", dark: "#4b3f30" },
  bear: { light: "#9a7050", base: "#5e3f28", dark: "#2f1d10" },
  lion: { light: "#f0d59d", base: "#cfa05a", dark: "#7d5a2a" },
  mane: { light: "#a86a2e", base: "#7a4518", dark: "#3e2008" },
} satisfies Record<string, Fur>;

export const INK = "rgba(28,16,8,0.7)";
export const BONE = "#efe3cc";
export const NOSE = "#2a1a12";

export const poly = (g: G, pts: number[], fill: string | CanvasGradient, stroke: string | null = INK, width = 1.2): void => {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (!stroke) return;
  g.strokeStyle = stroke;
  g.lineWidth = width;
  g.stroke();
};

/** Diagonal fur gradient lit from the upper-left. */
export const furGrad = (g: G, fur: Fur, x0: number, y0: number, x1: number, y1: number): CanvasGradient => {
  const grad = g.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0, fur.light);
  grad.addColorStop(0.45, fur.base);
  grad.addColorStop(1, fur.dark);
  return grad;
};

/** Army-colored cloth gradient (saddles, capes, stoles). */
export const cloth = (g: G, f: Faction, x0: number, x1: number): CanvasGradient => {
  const grad = g.createLinearGradient(x0, 0, x1, 0);
  grad.addColorStop(0, f.light);
  grad.addColorStop(0.4, f.base);
  grad.addColorStop(1, f.dark);
  return grad;
};

/** Filled ellipse with a soft dark outline. */
export const blob = (g: G, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, rot = 0, stroke: string | null = INK): void => {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  if (!stroke) return;
  g.strokeStyle = stroke;
  g.lineWidth = 1.2;
  g.stroke();
};

export const groundShadow = (g: G, rx = 20): void => {
  ellipse(g, X, 89, rx, 6, "rgba(0,0,0,0.35)");
};

/** An animal eye: army-colored iris, black pupil, white glint. */
export const eye = (g: G, f: Faction, x: number, y: number, r: number): void => {
  ellipse(g, x, y, r + 0.8, r + 0.8, "#1a1008");
  ellipse(g, x, y, r, r, f.base);
  ellipse(g, x + r * 0.1, y + r * 0.1, r * 0.55, r * 0.55, "#0a0604");
  ellipse(g, x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.3, "#ffffff");
};

/** A collar band around a neck ellipse, with a trim buckle/pendant hanging below. */
export const collar = (g: G, f: Faction, x: number, y: number, rx: number, ry: number, pendant = true): void => {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI);
  g.lineWidth = 4;
  g.strokeStyle = f.dark;
  g.stroke();
  g.beginPath();
  g.ellipse(x, y - 0.6, rx, ry, 0, 0.15, Math.PI - 0.15);
  g.lineWidth = 2.4;
  g.strokeStyle = f.base;
  g.stroke();
  if (!pendant) return;
  ellipse(g, x, y + ry + 2.5, 2.6, 3, f.trim);
  ellipse(g, x - 0.8, y + ry + 1.8, 0.9, 0.9, "#fff6d0");
};

export const stroke = (g: G, pts: number[], color: string, width: number): void => {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.stroke();
};

export const darker = (hex: string, amt = 0.15): string => shade(hex, -amt);
