import { TILE_H, TILE_W } from "../../iso";
import { ellipse } from "../canvas";
import type { SurfacePainter } from "./recipe";

/** Factories for the detail painted on an iso tile's diamond top. */

/** Little V-shaped grass blades. */
export const blades = (color: string, count = 6): SurfacePainter => (g, cx, cy, r) => {
  g.strokeStyle = color;
  g.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    const x = cx + (r() - 0.5) * TILE_W * 0.6;
    const y = cy + (r() - 0.5) * TILE_H * 0.5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - 2, y - 4);
    g.moveTo(x, y);
    g.lineTo(x + 2, y - 4);
    g.stroke();
  }
};

/** Flat ovals (leaf litter, pebbles, embers, snow clumps) in alternating colours. */
export const litter = (hues: [string, string], count = 7, rx = 3, ry = 1.5): SurfacePainter => (g, cx, cy, r) => {
  for (let i = 0; i < count; i++) {
    ellipse(g, cx + (r() - 0.5) * TILE_W * 0.6, cy + (r() - 0.5) * TILE_H * 0.5, rx, ry, i % 2 ? hues[0] : hues[1]);
  }
};

/** Water rings plus optional lily pads with a flower. */
export const ripples = (ring: string, pad: string | null, flower: string | null): SurfacePainter => (g, cx, cy, r) => {
  g.strokeStyle = ring;
  g.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.ellipse(cx + (r() - 0.5) * 30, cy + (r() - 0.5) * 12, 8 + r() * 6, 3 + r() * 2, 0, 0, Math.PI * 2);
    g.stroke();
  }
  if (!pad) return;
  for (let i = 0; i < 2; i++) {
    const x = cx + (r() - 0.5) * 40;
    const y = cy + (r() - 0.5) * 16;
    ellipse(g, x, y, 5, 2.5, pad);
    if (flower) ellipse(g, x + 1, y - 0.5, 1.5, 0.8, flower);
  }
};

/** Jagged crack lines. */
export const cracks = (color: string, count = 4, width = 1): SurfacePainter => (g, cx, cy, r) => {
  g.strokeStyle = color;
  g.lineWidth = width;
  for (let i = 0; i < count; i++) {
    let x = cx + (r() - 0.5) * TILE_W * 0.6;
    let y = cy + (r() - 0.5) * TILE_H * 0.5;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      x += (r() - 0.5) * 10;
      y += r() * 4;
      g.lineTo(x, y);
    }
    g.stroke();
  }
};

/** Wind-blown dune crests. */
export const dunes = (color: string): SurfacePainter => (g, cx, cy, r) => {
  g.strokeStyle = color;
  g.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const y = cy - TILE_H * 0.3 + i * 7 + r() * 3;
    g.beginPath();
    g.moveTo(cx - 26 + r() * 6, y);
    g.quadraticCurveTo(cx, y - 5, cx + 26 - r() * 6, y + 2);
    g.stroke();
  }
};

/** Lane lines along the diamond's two axes with a glowing centre dot (asphalt grid). */
export const lanes = (color: string): SurfacePainter => (g, cx, cy) => {
  g.strokeStyle = color;
  g.lineWidth = 1.2;
  g.setLineDash([5, 4]);
  g.beginPath();
  g.moveTo(cx - TILE_W * 0.42, cy);
  g.lineTo(cx + TILE_W * 0.42, cy);
  g.moveTo(cx, cy - TILE_H * 0.42);
  g.lineTo(cx, cy + TILE_H * 0.42);
  g.stroke();
  g.setLineDash([]);
};

/** A pool of glowing liquid with a bright rim and dark fissures around it. */
export const pool = (fill: string, rim: string, shore: string): SurfacePainter => (g, cx, cy, r) => {
  const rx = 18 + r() * 8;
  const ry = 7 + r() * 3;
  ellipse(g, cx + (r() - 0.5) * 10, cy + (r() - 0.5) * 6, rx + 3, ry + 1.5, shore);
  g.save();
  g.shadowColor = rim;
  g.shadowBlur = 8;
  ellipse(g, cx + (r() - 0.5) * 10, cy + (r() - 0.5) * 6, rx, ry, fill);
  g.restore();
  ellipse(g, cx - 4, cy - 2, rx * 0.4, ry * 0.3, rim);
};

/** Fine parallel scratches (ice, wind-scoured gravel, striated clay). */
export const striae = (color: string, count = 5): SurfacePainter => (g, cx, cy, r) => {
  g.strokeStyle = color;
  g.lineWidth = 0.8;
  for (let i = 0; i < count; i++) {
    const y = cy + (r() - 0.5) * TILE_H * 0.7;
    const len = 10 + r() * 20;
    const x = cx + (r() - 0.5) * (TILE_W * 0.6 - len);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y - len * 0.5 * (r() > 0.5 ? 1 : -1) * 0.3);
    g.stroke();
  }
};

/** Polygonal cells of cracked mud or cooled basalt. */
export const cells = (color: string): SurfacePainter => (g, cx, cy, r) => {
  g.strokeStyle = color;
  g.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const x = cx + (r() - 0.5) * TILE_W * 0.55;
    const y = cy + (r() - 0.5) * TILE_H * 0.5;
    const rad = 4 + r() * 4;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + r() * 0.3;
      const px = x + Math.cos(a) * rad;
      const py = y + Math.sin(a) * rad * 0.5;
      if (k === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.stroke();
  }
};
