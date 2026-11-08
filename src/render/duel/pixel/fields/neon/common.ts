import { TILE_W, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import type { Palette } from "../../palette";

/**
 * Shared pieces for the Neon City battlefields: the night sky with its city glow, skyline
 * silhouettes with window grids, neon signs and wet reflections. Every shape wraps at TILE_W.
 */

export const NEON = {
  cyan: "#39e6ff",
  magenta: "#ff3bd1",
  toxic: "#53ff6a",
  ice: "#9fe8ff",
  amber: "#ffb05a",
  yellow: "#ffd23b",
  white: "#e8f6ff",
};

/** Horizontal strata with explicit seam rows and a short ordered-dither blend at each seam. */
export const strata = (p: PixelPainter, stops: [number, string][], bottom: number, blend = 3): void => {
  for (let i = 0; i < stops.length; i++) {
    const [y, c] = stops[i];
    const end = i + 1 < stops.length ? stops[i + 1][0] : bottom;
    p.rect(0, y, p.w, end - y, c);
  }
  for (let i = 1; i < stops.length; i++) {
    const [seam, c] = stops[i];
    for (let b = 0; b < blend; b++) p.dither(0, seam - blend + b, p.w, 1, c, Math.round(((b + 1) / (blend + 1)) * 16));
  }
};

/** Signed horizontal distance from `px` to `x`, wrapped into [-TILE_W/2, TILE_W/2). */
export const wdx = (x: number, px: number): number => ((((x - px) % TILE_W) + TILE_W * 1.5) % TILE_W) - TILE_W / 2;

/** Stamps a grid by its bottom-centre anchor. */
export const plant = (p: PixelPainter, g: Grid, cx: number, by: number, pal: Palette): void => {
  p.stamp(g, Math.round(cx - g[0].length / 2), by - g.length + 1, pal);
};

// ---------------------------------------------------------------- sky

export interface SkySpec {
  stops: [number, string][];
  bottom: number;
  /** Star colours, dimmest first. */
  stars: string[];
  seed: number;
  starCount?: number;
}

/** Night sky bands with a scatter of small stars in the upper half. */
export const nightSky = (p: PixelPainter, s: SkySpec): void => {
  strata(p, s.stops, s.bottom, 4);
  p.reseed(s.seed);
  const n = s.starCount ?? 26;
  for (let k = 0; k < n; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 21 + Math.floor(p.rand() * 38);
    const bright = p.rand();
    if (bright > 0.9) {
      p.px(x, y, s.stars[s.stars.length - 1]);
      p.px(x - 1, y, s.stars[0]);
      p.px(x + 1, y, s.stars[0]);
      p.px(x, y - 1, s.stars[0]);
      p.px(x, y + 1, s.stars[0]);
    } else p.px(x, y, s.stars[bright > 0.6 ? 1 : 0]);
  }
};

/** Thin flat smog streaks (for a drifting layer): each a clean two- or three-row sliver. */
export const smog = (p: PixelPainter, streaks: [number, number, number][], hi: string, lo: string): void => {
  for (const [x, y, len] of streaks) {
    p.hline(x + 5, y, len - 12, hi);
    p.hline(x, y + 1, len, lo);
    p.hline(x + 8, y + 2, Math.max(4, len - 20), lo);
  }
};

// ---------------------------------------------------------------- skyline

export interface SkylineSpec {
  seed: number;
  /** Row the buildings stand on (they are filled down to `bottom`). */
  base: number;
  bottom: number;
  minH: number;
  maxH: number;
  minW: number;
  maxW: number;
  gap: number;
  walls: string[];
  rim: string;
  windows: string[];
  litChance: number;
  /** Optional rooftop beacon colour for the tallest towers. */
  beacon?: string;
}

/** One rectangular tower with an optional setback crown, a lit left edge and a window grid. */
const building = (p: PixelPainter, x: number, top: number, w: number, s: SkylineSpec, wall: string): void => {
  p.rect(x, top, w, s.bottom - top, wall);
  // setback crown on wider towers
  let roof = top;
  if (w >= 10 && p.rand() > 0.45) {
    const cw = Math.max(4, Math.floor(w * 0.5));
    const ch = 3 + Math.floor(p.rand() * 5);
    const cx = x + Math.floor((w - cw) / 2);
    p.rect(cx, top - ch, cw, ch, wall);
    p.hline(cx, top - ch, cw, s.rim);
    roof = top - ch;
  }
  p.hline(x, top, w, s.rim);
  p.vline(x, top, s.bottom - top, s.rim);
  // antenna and beacon
  if (s.beacon && w < 14 && top < s.base - s.maxH * 0.7) {
    const ax = x + Math.floor(w / 2);
    p.vline(ax, roof - 5, 5, s.rim);
    p.px(ax, roof - 6, s.beacon);
  }
  // window grid: one style per tower
  const style = Math.floor(p.rand() * 3);
  const win = s.windows[Math.floor(p.rand() * s.windows.length)];
  const sx = style === 1 ? 3 : 2;
  const sy = style === 2 ? 2 : 3;
  for (let y = top + 3; y < s.base - 2; y += sy)
    for (let xx = x + 2; xx < x + w - 1; xx += sx) {
      if (p.rand() > s.litChance) continue;
      if (style === 1) p.hline(xx, y, 2, win);
      else p.px(xx, y, win);
    }
};

export interface Tower {
  x: number;
  top: number;
  w: number;
}

/** A row of towers that tiles exactly across TILE_W; returns the towers so signs can hang on them. */
export const skyline = (p: PixelPainter, s: SkylineSpec): Tower[] => {
  p.reseed(s.seed);
  const out: Tower[] = [];
  let x = 0;
  let k = 0;
  while (x < TILE_W) {
    let w = s.minW + Math.floor(p.rand() * (s.maxW - s.minW + 1));
    if (TILE_W - (x + w + s.gap) < s.minW) w = TILE_W - x - s.gap;
    if (w < 3) break;
    const h = s.minH + Math.floor(p.rand() * (s.maxH - s.minH + 1));
    building(p, x, s.base - h, w, s, s.walls[k % s.walls.length]);
    out.push({ x, top: s.base - h, w });
    x += w + s.gap;
    k++;
  }
  return out;
};

// ---------------------------------------------------------------- signs and glow

const GLYPHS: Grid[] = [
  ["xxx", "x.x", "xxx"],
  ["x.x", "xxx", "..x"],
  ["xx.", ".xx", "xx."],
  ["xxx", ".x.", "x.x"],
  [".x.", "xxx", ".x."],
  ["x..", "xxx", "x.x"],
];

/** A vertical neon sign: dark panel, glowing frame, stacked glyphs. */
export const vSign = (p: PixelPainter, x: number, y: number, n: number, glow: string, panel: string, seed: number): void => {
  const h = n * 4 + 3;
  p.rect(x, y, 7, h, panel);
  p.hline(x, y, 7, glow);
  p.hline(x, y + h - 1, 7, glow);
  p.vline(x, y, h, glow);
  p.vline(x + 6, y, h, glow);
  for (let i = 0; i < n; i++) p.stamp(GLYPHS[(seed + i * 5) % GLYPHS.length], x + 2, y + 2 + i * 4, { x: glow });
};

/** A horizontal neon sign or billboard bar. */
export const hSign = (p: PixelPainter, x: number, y: number, n: number, glow: string, panel: string, seed: number): void => {
  const w = n * 4 + 3;
  p.rect(x, y, w, 7, panel);
  p.hline(x, y, w, glow);
  p.hline(x, y + 6, w, glow);
  p.vline(x, y, 7, glow);
  p.vline(x + w - 1, y, 7, glow);
  for (let i = 0; i < n; i++) p.stamp(GLYPHS[(seed + i * 7) % GLYPHS.length], x + 2 + i * 4, y + 2, { x: glow });
};

/** A dithered halo: a few concentric rings fading out (opaque pixels only). */
export const halo = (p: PixelPainter, cx: number, cy: number, r: number, c: string, level = 6): void => {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y) / r;
      if (d > 1) continue;
      const l = Math.round(level * (1 - d) * 2);
      const xx = cx + x, yy = cy + y;
      const t = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]][((yy % 4) + 4) % 4][((xx % 4) + 4) % 4];
      if (t < l) p.px(xx, yy, c);
    }
};

/** A wet-asphalt reflection: a broken vertical streak, solid at the top and breaking up below. */
export const reflection = (p: PixelPainter, x: number, y: number, w: number, len: number, hi: string, lo: string): void => {
  for (let k = 0; k < len; k++) {
    if (k % 3 === 2) continue;
    const off = (k >> 1) % 2;
    const c = k < len * 0.4 ? hi : lo;
    const ww = Math.max(1, w - Math.floor((k / len) * w));
    p.hline(x + off, y + k, ww, c);
  }
};
