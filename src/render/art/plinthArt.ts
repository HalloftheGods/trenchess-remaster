import Phaser from "phaser";
import { TILE_H, TILE_W, TOP_TILE } from "../iso";
import { diamondPath, ellipse, paint, rand } from "./canvas";

/** Carved stone plinths the board rests on: a diamond slab for iso, a square slab for top-down. */

export const PLINTH_MARGIN = 48;
const THICK = 40;
const DROP = 26;

export interface PlinthSpec {
  key: string;
  width: number;
  height: number;
  /** Texture-space point that sits on the board's surface centre. */
  anchorX: number;
  anchorY: number;
  /** Board size the plinth is carved for. */
  n: number;
}

export const plinthIso = (n: number): PlinthSpec => ({
  key: `plinth-iso-${n}`,
  width: n * TILE_W + 2 * PLINTH_MARGIN,
  height: n * TILE_H + PLINTH_MARGIN + THICK + DROP,
  anchorX: (n / 2) * TILE_W + PLINTH_MARGIN,
  anchorY: (n / 2) * TILE_H + PLINTH_MARGIN / 2,
  n,
});

export const plinthTop = (n: number): PlinthSpec => ({
  key: `plinth-top-${n}`,
  width: n * TOP_TILE + 2 * PLINTH_MARGIN + 2 * DROP,
  height: n * TOP_TILE + 2 * PLINTH_MARGIN + 2 * DROP,
  anchorX: (n / 2) * TOP_TILE + PLINTH_MARGIN + DROP,
  anchorY: (n / 2) * TOP_TILE + PLINTH_MARGIN + DROP,
  n,
});

/** Specs for the Extended board, kept for callers that only need the default size. */
export const PLINTH_ISO: PlinthSpec = plinthIso(12);
export const PLINTH_TOP: PlinthSpec = plinthTop(12);

const STONE_LIT = "#8e8475";
const STONE_DIM = "#5c5247";
const GROOVE = "rgba(20,14,8,0.55)";
const RIDGE = "rgba(255,240,215,0.22)";

const stoneFill = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): CanvasGradient => {
  const grad = g.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0, STONE_LIT);
  grad.addColorStop(1, STONE_DIM);
  return grad;
};

const grain = (g: CanvasRenderingContext2D, count: number, seed: number, w: number, h: number): void => {
  const r = rand(seed);
  for (let i = 0; i < count; i++) {
    g.globalAlpha = 0.05 + r() * 0.12;
    g.fillStyle = r() > 0.5 ? "#000000" : "#ffffff";
    g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 1.5);
  }
  g.globalAlpha = 1;
};

const rosette = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void => {
  ellipse(g, x, y, rx, ry, GROOVE);
  ellipse(g, x - rx * 0.1, y - ry * 0.15, rx * 0.65, ry * 0.65, "#7c7264");
  ellipse(g, x, y, rx * 0.28, ry * 0.28, GROOVE);
};

/** Shadow the tiles cast onto the margin: dark just outside the board edge, fading outward. */
const contactShadow = (g: CanvasRenderingContext2D, path: () => void): void => {
  g.save();
  g.shadowColor = "rgba(0,0,0,0.75)";
  g.shadowBlur = 26;
  g.fillStyle = "#000000";
  path();
  g.fill();
  g.restore();
};

const drawIso = (g: CanvasRenderingContext2D, spec: PlinthSpec): void => {
  const { anchorX: cx, anchorY: cy, width, height, n } = spec;
  const hw = (n / 2) * TILE_W + PLINTH_MARGIN;
  const hh = hw / 2;
  // drop shadow onto the ground
  ellipse(g, cx, cy + hh * 0.35 + THICK, hw * 1.08, hh * 0.9 + THICK, "rgba(0,0,0,0.5)");
  g.filter = "blur(14px)";
  ellipse(g, cx, cy + THICK + 6, hw * 1.02, hh * 1.02, "rgba(0,0,0,0.65)");
  g.filter = "none";
  // side faces
  g.beginPath();
  g.moveTo(cx - hw, cy);
  g.lineTo(cx, cy + hh);
  g.lineTo(cx, cy + hh + THICK);
  g.lineTo(cx - hw, cy + THICK);
  g.closePath();
  g.fillStyle = "#3f372f";
  g.fill();
  g.beginPath();
  g.moveTo(cx + hw, cy);
  g.lineTo(cx, cy + hh);
  g.lineTo(cx, cy + hh + THICK);
  g.lineTo(cx + hw, cy + THICK);
  g.closePath();
  g.fillStyle = "#564c42";
  g.fill();
  // chiselled band along the faces
  g.strokeStyle = GROOVE;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx - hw, cy + THICK * 0.55);
  g.lineTo(cx, cy + hh + THICK * 0.55);
  g.lineTo(cx + hw, cy + THICK * 0.55);
  g.stroke();
  g.strokeStyle = RIDGE;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx - hw, cy + THICK * 0.55 + 3);
  g.lineTo(cx, cy + hh + THICK * 0.55 + 3);
  g.lineTo(cx + hw, cy + THICK * 0.55 + 3);
  g.stroke();
  // top face
  diamondPath(g, cx, cy, hw * 2, hh * 2);
  g.fillStyle = stoneFill(g, cx - hw, cy - hh, cx + hw, cy + hh);
  g.fill();
  g.save();
  diamondPath(g, cx, cy, hw * 2, hh * 2);
  g.clip();
  grain(g, 900, 77, width, height);
  // carved border grooves
  for (const inset of [12, 26]) {
    diamondPath(g, cx, cy + 1.5, (hw - inset) * 2, (hh - inset / 2) * 2);
    g.strokeStyle = RIDGE;
    g.lineWidth = 1.5;
    g.stroke();
    diamondPath(g, cx, cy, (hw - inset) * 2, (hh - inset / 2) * 2);
    g.strokeStyle = GROOVE;
    g.lineWidth = 2;
    g.stroke();
  }
  rosette(g, cx, cy - hh + 19, 9, 4.5);
  rosette(g, cx, cy + hh - 19, 9, 4.5);
  rosette(g, cx - hw + 38, cy, 9, 4.5);
  rosette(g, cx + hw - 38, cy, 9, 4.5);
  contactShadow(g, () => diamondPath(g, cx, cy, n * TILE_W + 6, n * TILE_H + 3));
  g.restore();
  // bevel highlights: lit upper-left edges, dark lower-right
  g.lineWidth = 2;
  g.strokeStyle = "rgba(255,240,215,0.35)";
  g.beginPath();
  g.moveTo(cx - hw, cy);
  g.lineTo(cx, cy - hh);
  g.lineTo(cx + hw, cy);
  g.stroke();
  g.strokeStyle = "rgba(0,0,0,0.45)";
  g.beginPath();
  g.moveTo(cx - hw, cy);
  g.lineTo(cx, cy + hh);
  g.lineTo(cx + hw, cy);
  g.stroke();
};

const drawTop = (g: CanvasRenderingContext2D, spec: PlinthSpec): void => {
  const { anchorX: cx, anchorY: cy, width, height, n } = spec;
  const half = (n / 2) * TOP_TILE + PLINTH_MARGIN;
  g.filter = "blur(12px)";
  g.fillStyle = "rgba(0,0,0,0.6)";
  g.fillRect(cx - half + 10, cy - half + 14, half * 2 + 4, half * 2 + 6);
  g.filter = "none";
  g.fillStyle = stoneFill(g, cx - half, cy - half, cx + half, cy + half);
  g.fillRect(cx - half, cy - half, half * 2, half * 2);
  g.save();
  g.beginPath();
  g.rect(cx - half, cy - half, half * 2, half * 2);
  g.clip();
  grain(g, 900, 78, width, height);
  for (const inset of [12, 26]) {
    g.strokeStyle = RIDGE;
    g.lineWidth = 1.5;
    g.strokeRect(cx - half + inset, cy - half + inset + 1.5, (half - inset) * 2, (half - inset) * 2);
    g.strokeStyle = GROOVE;
    g.lineWidth = 2;
    g.strokeRect(cx - half + inset, cy - half + inset, (half - inset) * 2, (half - inset) * 2);
  }
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) rosette(g, cx + sx * (half - 19), cy + sy * (half - 19), 7, 7);
  contactShadow(g, () => {
    g.beginPath();
    g.rect(cx - (n / 2) * TOP_TILE - 3, cy - (n / 2) * TOP_TILE - 3, n * TOP_TILE + 6, n * TOP_TILE + 6);
  });
  g.restore();
  g.lineWidth = 2;
  g.strokeStyle = "rgba(255,240,215,0.35)";
  g.beginPath();
  g.moveTo(cx - half, cy + half);
  g.lineTo(cx - half, cy - half);
  g.lineTo(cx + half, cy - half);
  g.stroke();
  g.strokeStyle = "rgba(0,0,0,0.45)";
  g.beginPath();
  g.moveTo(cx + half, cy - half);
  g.lineTo(cx + half, cy + half);
  g.lineTo(cx - half, cy + half);
  g.stroke();
};

export const PLINTH_SIZES = [8, 12];

export const paintPlinth = (scene: Phaser.Scene): void => {
  for (const n of PLINTH_SIZES) {
    const iso = plinthIso(n);
    const top = plinthTop(n);
    paint(scene, iso.key, iso.width, iso.height, (g) => drawIso(g, iso));
    paint(scene, top.key, top.width, top.height, (g) => drawTop(g, top));
  }
};
