import type { Faction } from "../unitArt";
import { ellipse, shade } from "../canvas";

export type G = CanvasRenderingContext2D;

/** Horizontal center of the 64x100 unit canvas. */
export const X = 32;
export const TAU = Math.PI * 2;

/** Head center / radius shared by every figure so the chibi proportions match across the set. */
export const HEAD_Y = 32;
export const HEAD_R = 15;

/** A moulded colour: light face, base, shadow side. Pastel so the toys read as matte vinyl. */
export interface Fur {
  light: string;
  base: string;
  dark: string;
}

export const FUR = {
  hare: { light: "#fbf1e6", base: "#ead2b8", dark: "#c4a082" },
  stag: { light: "#f3d2ad", base: "#dba572", dark: "#a8713f" },
  owl: { light: "#efe4d4", base: "#cfbaa0", dark: "#9c846a" },
  bear: { light: "#d7ab86", base: "#b5805a", dark: "#7f5435" },
  lion: { light: "#fbeec4", base: "#efd088", dark: "#c4a050" },
  mane: { light: "#eab070", base: "#cf8544", dark: "#945826" },
  bone: { light: "#fffaf0", base: "#f1e6d2", dark: "#c3b093" },
  gold: { light: "#fff3b0", base: "#f2c94c", dark: "#a67c1a" },
  pink: { light: "#ffd9e0", base: "#f4b3bf", dark: "#d98896" },
} satisfies Record<string, Fur>;

export const INK = "#2a1d16";
export const CREAM = "#f6efe4";

export const furOf = (f: Faction): Fur => ({ light: f.light, base: f.base, dark: f.dark });

export const poly = (g: G, pts: number[], fill: string | CanvasGradient, stroke: string | null = null, width = 1): void => {
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

/**
 * One moulded vinyl part: an ellipse with a soft radial gradient lit from the upper-left,
 * a single broad specular highlight and a slightly darker rim that reads as the mould seam.
 */
export const vinyl = (g: G, x: number, y: number, rx: number, ry: number, c: Fur, rot = 0, seam = true): void => {
  const r = Math.max(rx, ry);
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(rx / r, ry / r);
  const grad = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r * 1.08);
  grad.addColorStop(0, c.light);
  grad.addColorStop(0.5, c.base);
  grad.addColorStop(1, c.dark);
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fillStyle = grad;
  g.fill();
  g.beginPath();
  g.ellipse(-r * 0.4, -r * 0.45, r * 0.3, r * 0.17, -0.65, 0, TAU);
  g.fillStyle = "rgba(255,255,255,0.5)";
  g.fill();
  g.restore();
  if (!seam) return;
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, TAU);
  g.strokeStyle = shade(c.dark, -0.12);
  g.lineWidth = 1.1;
  g.stroke();
};

/** Dot eye: black bead with a white highlight. */
export const dotEye = (g: G, x: number, y: number, r: number): void => {
  ellipse(g, x, y, r, r, "#1c1512");
  ellipse(g, x - r * 0.35, y - r * 0.38, r * 0.38, r * 0.38, "#ffffff");
};

/** Chibi face on a head of radius r: dot eyes, blush circles and a tiny smile. */
export const face = (g: G, cx: number, cy: number, r: number, eyeDy = 0, smile = true): void => {
  const ey = cy + r * 0.02 + eyeDy;
  dotEye(g, cx - r * 0.38, ey, Math.max(1.7, r * 0.12));
  dotEye(g, cx + r * 0.38, ey, Math.max(1.7, r * 0.12));
  ellipse(g, cx - r * 0.58, ey + r * 0.3, r * 0.17, r * 0.12, "rgba(240,130,145,0.45)");
  ellipse(g, cx + r * 0.58, ey + r * 0.3, r * 0.17, r * 0.12, "rgba(240,130,145,0.45)");
  if (!smile) return;
  g.beginPath();
  g.arc(cx, ey + r * 0.28, r * 0.16, Math.PI * 0.2, Math.PI * 0.8);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.lineCap = "round";
  g.stroke();
};

/** Small round display base: pale top, army-coloured rim, drop shadow. Sits at y 86-92. */
export const displayBase = (g: G, f: Faction): void => {
  ellipse(g, X, 91.5, 22, 5, "rgba(0,0,0,0.32)");
  ellipse(g, X, 89.5, 19.5, 5.5, f.dark);
  g.fillStyle = f.dark;
  g.fillRect(X - 19.5, 86, 39, 3.5);
  ellipse(g, X, 86, 19.5, 5.5, f.base);
  g.beginPath();
  g.ellipse(X, 86, 19.5, 5.5, 0, Math.PI * 1.1, Math.PI * 1.9);
  g.strokeStyle = f.light;
  g.lineWidth = 1.2;
  g.stroke();
  ellipse(g, X, 86, 15.5, 4, CREAM);
  ellipse(g, X, 85.6, 15.5, 4, "#fbf7f0");
};

/** Army-coloured scarf wrapped around the head/body joint, knot and tail on the right. */
export const scarf = (g: G, f: Faction, y: number, rx: number): void => {
  g.beginPath();
  g.ellipse(X, y, rx, 4.2, 0, 0.05, Math.PI - 0.05);
  g.strokeStyle = f.dark;
  g.lineWidth = 5.5;
  g.lineCap = "round";
  g.stroke();
  g.beginPath();
  g.ellipse(X, y - 0.8, rx, 4.2, 0, 0.2, Math.PI - 0.2);
  g.strokeStyle = f.base;
  g.lineWidth = 3.4;
  g.stroke();
  g.beginPath();
  g.ellipse(X - 1, y - 1.4, rx - 1, 3.6, 0, 0.5, Math.PI * 0.8);
  g.strokeStyle = f.light;
  g.lineWidth = 1.2;
  g.stroke();
  vinyl(g, X + rx - 1, y + 5, 3.2, 3.2, furOf(f));
  poly(g, [X + rx - 2, y + 7, X + rx + 3, y + 7, X + rx + 2, y + 16, X + rx - 3, y + 15], f.base, f.dark, 1);
};
