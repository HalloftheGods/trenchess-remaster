import type { Faction } from "../unitArt";
import { ellipse, radial } from "../canvas";

export type G = CanvasRenderingContext2D;

export const X = 32;

export interface Tones {
  light: string;
  base: string;
  dark: string;
}

export const BONE: Tones = { light: "#f7f1e1", base: "#d9ccae", dark: "#8c7c5c" };
export const IRON: Tones = { light: "#8f7a6e", base: "#56413a", dark: "#261a16" };
export const RUST = "#a4542a";
export const SOUL = { core: "#f2fff5", mid: "#6ff0a3", deep: "#1f9a58" };
export const INK = "rgba(28,18,12,0.7)";

export const alpha = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const grad = (g: G, t: Tones, x0: number, x1: number): CanvasGradient => {
  const lg = g.createLinearGradient(x0, 0, x1, 0);
  lg.addColorStop(0, t.light);
  lg.addColorStop(0.45, t.base);
  lg.addColorStop(1, t.dark);
  return lg;
};

export const lit = (g: G, f: Faction, x0: number, x1: number): CanvasGradient => grad(g, f, x0, x1);

export const poly = (g: G, pts: number[], fill: string | CanvasGradient, stroke = INK, lw = 1.2): void => {
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

/** A long bone: shaft with knobbed ends, dark outline underneath. */
export const bone = (g: G, x0: number, y0: number, x1: number, y1: number, w: number): void => {
  line(g, x0, y0, x1, y1, INK, w + 1.6);
  line(g, x0, y0, x1, y1, BONE.base, w);
  for (const [x, y] of [[x0, y0], [x1, y1]]) {
    ellipse(g, x, y, w * 0.85, w * 0.7, INK);
    ellipse(g, x - 0.3, y - 0.3, w * 0.6, w * 0.5, BONE.light);
  }
};

/** Rib arcs hanging off a spine centred at cx, from y downward. */
export const ribs = (g: G, cx: number, top: number, w: number, n: number): void => {
  bone(g, cx, top - 2, cx, top + n * 4.5 + 2, 1.8);
  for (let i = 0; i < n; i++) {
    const y = top + i * 4.5;
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx, y);
      g.quadraticCurveTo(cx + side * w * 0.9, y - 1, cx + side * w, y + 3.5);
      g.strokeStyle = INK;
      g.lineWidth = 2.6;
      g.stroke();
      g.strokeStyle = side < 0 ? BONE.light : BONE.base;
      g.lineWidth = 1.4;
      g.stroke();
    }
  }
};

/** Eye glow in the army colour: a soft halo with a hot core. */
export const eye = (g: G, x: number, y: number, r: number, f: Faction): void => {
  ellipse(g, x, y, r * 2.2, r * 2.2, radial(g, x, y, r * 2.2, [[0, alpha(f.light, 0.7)], [1, alpha(f.light, 0)]]));
  ellipse(g, x, y, r, r, f.light);
  ellipse(g, x - r * 0.2, y - r * 0.2, r * 0.45, r * 0.45, "#ffffff");
};

/** A skull facing the viewer; r is the cranium radius. */
export const skull = (g: G, x: number, y: number, r: number, f: Faction, jawOpen = 0): void => {
  const jy = y + r * 0.55 + jawOpen;
  poly(g, [x - r * 0.62, jy - 2, x + r * 0.62, jy - 2, x + r * 0.5, jy + r * 0.55, x - r * 0.5, jy + r * 0.55], BONE.base);
  for (let i = -2; i <= 2; i++) line(g, x + i * r * 0.22, jy - 1, x + i * r * 0.22, jy + r * 0.35, INK, 0.8);
  if (jawOpen > 0) poly(g, [x - r * 0.5, y + r * 0.6, x + r * 0.5, y + r * 0.6, x + r * 0.45, jy - 1, x - r * 0.45, jy - 1], "#120c08", INK, 0.6);
  ellipse(g, x, y - r * 0.1, r + 0.8, r * 0.95 + 0.8, INK);
  ellipse(g, x, y - r * 0.1, r, r * 0.95, grad(g, BONE, x - r, x + r));
  ellipse(g, x - r * 0.3, y - r * 0.45, r * 0.45, r * 0.3, alpha("#ffffff", 0.5));
  for (const side of [-1, 1]) ellipse(g, x + side * r * 0.42, y + r * 0.05, r * 0.3, r * 0.33, "#120c08");
  for (const side of [-1, 1]) eye(g, x + side * r * 0.42, y + r * 0.08, r * 0.14, f);
  poly(g, [x - r * 0.12, y + r * 0.55, x + r * 0.12, y + r * 0.55, x, y + r * 0.3], "#120c08", INK, 0);
};

/** Soul-flame: a flickering teardrop of green fire with a halo. */
export const flame = (g: G, x: number, y: number, h: number): void => {
  ellipse(g, x, y, h * 1.4, h * 1.4, radial(g, x, y, h * 1.4, [[0, alpha(SOUL.mid, 0.55)], [1, alpha(SOUL.mid, 0)]]));
  const tongue = (hh: number, fill: string | CanvasGradient, lean: number): void => {
    g.beginPath();
    g.moveTo(x + lean, y - hh);
    g.bezierCurveTo(x + hh * 0.75, y - hh * 0.3, x + hh * 0.55, y + hh * 0.5, x, y + hh * 0.55);
    g.bezierCurveTo(x - hh * 0.55, y + hh * 0.5, x - hh * 0.75, y - hh * 0.3, x + lean, y - hh);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  tongue(h, radial(g, x, y + h * 0.2, h * 1.1, [[0, SOUL.mid], [0.7, SOUL.deep], [1, alpha(SOUL.deep, 0.2)]]), -h * 0.15);
  tongue(h * 0.55, SOUL.core, -h * 0.05);
};

/** Tattered cloth: a quad whose bottom edge is torn into points. */
export const tatter = (g: G, x0: number, y0: number, x1: number, y1: number, bx0: number, bx1: number, by: number, fill: string | CanvasGradient, depth = 4): void => {
  const pts = [x0, y0, x1, y1];
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = bx1 + (bx0 - bx1) * t;
    const up = i % 2 === 0 ? 0 : depth;
    pts.push(x, by - up + Math.sin(i * 2.3) * 1.2);
  }
  poly(g, pts, fill, INK, 1);
};

/** Grave soil footing: a dark disc with bone chips and a faint army-coloured rim. */
export const ground = (g: G, f: Faction): void => {
  ellipse(g, X, 89, 21, 7, "#17120e");
  ellipse(g, X, 87, 21, 7, grad(g, { light: "#5a4d40", base: "#3a3028", dark: "#1e1813" }, X - 21, X + 21));
  ellipse(g, X, 86, 17, 4.5, alpha(f.base, 0.28));
  for (const [dx, dy, rx, ry] of [[-13, 86, 3, 1.2], [9, 89, 2.6, 1], [15, 85, 2, 0.9], [-4, 90, 2.2, 0.9]]) ellipse(g, X + dx, dy, rx, ry, BONE.base);
  g.strokeStyle = alpha(f.light, 0.45);
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(X, 87, 20, 6.4, 0, Math.PI * 1.05, Math.PI * 1.95);
  g.stroke();
  ellipse(g, X, 87, 21, 7, radial(g, X, 87, 21, [[0.6, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.25)"]]));
};
