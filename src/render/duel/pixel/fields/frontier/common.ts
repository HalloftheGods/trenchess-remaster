import type { Palette } from "../../palette";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";

/**
 * Shared pieces of the Frontier world's duel battlefields: the amber dusk sky with its low sun,
 * backlit streak clouds, hazy red mesa ranges, and the props (pines, saguaros, dry grass,
 * fence posts) that the five terrains reuse with their own palettes.
 */

// ---------------------------------------------------------------- helpers

/** Signed horizontal distance from `px` to `x`, wrapped into [-TILE_W/2, TILE_W/2). */
export const wdx = (x: number, px: number): number => ((((x - px) % TILE_W) + TILE_W * 1.5) % TILE_W) - TILE_W / 2;

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

/** Index of the stratum that row `y` falls in. */
export const bandAt = (stops: number[], y: number): number => {
  let i = 0;
  while (i + 1 < stops.length && y >= stops[i + 1]) i++;
  return i;
};

/** Stamps a grid by its bottom-centre anchor. */
export const plant = (p: PixelPainter, g: Grid, cx: number, by: number, pal: Palette): void => {
  p.stamp(g, Math.round(cx - g[0].length / 2), by - g.length + 1, pal);
};

// ---------------------------------------------------------------- dusk sky
export const DUSK = ["#2a1a2e", "#3a1f34", "#4e2738", "#66303a", "#843b38", "#a24834", "#bc5a30", "#d27034", "#e28a3c", "#eca44c", "#f4c068", "#f8d48c"];
export const SUN = { core: "#fff0c0", ring: "#ffe0a0", glow: "#ffc878", glow2: "#f6b062" };

const STARS: [number, number, number][] = [
  [14, 6, 1], [41, 13, 0], [70, 4, 0], [97, 10, 2], [131, 5, 0], [160, 15, 1], [188, 7, 0], [214, 12, 0],
  [243, 4, 1], [270, 14, 0], [298, 8, 2], [312, 18, 0], [55, 21, 0], [118, 22, 0], [232, 24, 0],
];

/** The amber dusk: plum overhead, through brick red, to a pale gold horizon; a big low sun at `sx`. */
export const paintDuskSky = (p: PixelPainter, sx = 224, sy = 86, r = 13): void => {
  const stops: [number, string][] = DUSK.map((c, i) => [Math.round(i * 8.6) + (i > 0 ? 6 : 0), c]);
  strata(p, stops, 124, 3);
  for (const [x, y, k] of STARS) {
    if (k === 2) {
      p.px(x, y, "#fff0d0");
      p.px(x - 1, y, "#8a5a6a");
      p.px(x + 1, y, "#8a5a6a");
      p.px(x, y - 1, "#8a5a6a");
      p.px(x, y + 1, "#8a5a6a");
    } else p.px(x, y, k === 1 ? "#e6c8b8" : "#9a6a72");
  }
  // glow: two dithered rings around the sun, a little wider than tall
  for (let y = sy - r - 16; y <= sy + r + 16; y++)
    for (let x = sx - r - 24; x <= sx + r + 24; x++) {
      const dx = x - sx, dy = (y - sy) * 1.3;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < r + 5) p.px(x, y, SUN.glow);
      else if (d < r + 11) p.dither(x, y, 1, 1, SUN.glow, 9);
      else if (d < r + 19) p.dither(x, y, 1, 1, SUN.glow2, 4);
    }
  p.disc(sx, sy, r + 2, SUN.ring);
  p.disc(sx, sy, r, SUN.core);
  // horizontal haze bars cutting the lower half of the sun
  for (const [off, th] of [[4, 1], [8, 1], [11, 2]] as [number, number][])
    for (let t = 0; t < th; t++) {
      const yy = off + t;
      const half = Math.floor((r + 2) * Math.sqrt(Math.max(0, 1 - (yy * yy) / ((r + 2) * (r + 2)))) + 0.35);
      p.hline(sx - half, sy + yy, half * 2 + 1, SUN.glow);
    }
};

/** Long backlit streak clouds: a dark plum belly with a hot rim along the underside. */
const STREAKS: [number, number, number][] = [
  [10, 34, 46], [92, 26, 30], [150, 44, 54], [262, 30, 38], [52, 56, 34], [200, 62, 44], [286, 52, 22], [120, 70, 26],
];

export const paintStreaks = (p: PixelPainter): void => {
  for (const [x, y, len] of STREAKS) {
    const warm = y > 50;
    const body = warm ? "#a04a40" : "#5a2c3c";
    const top = warm ? "#8a3e3e" : "#4a2436";
    const rim = warm ? "#f0a050" : "#c06a48";
    p.hline(x + 5, y - 1, Math.round(len * 0.5), top);
    p.hline(x, y, len, body);
    p.hline(x - 4, y + 1, len + 6, body);
    p.hline(x - 2, y + 2, len + 2, rim);
    p.hline(x + len - 4, y + 3, 10, rim);
    p.hline(x - 10, y + 2, 6, body);
  }
};

// ---------------------------------------------------------------- mesas
export interface Mesa {
  x: number;
  /** Top row of the cap rock. */
  y: number;
  /** Half-width of the flat top. */
  w: number;
  /** Rows of sheer cap rock before the talus slope. */
  cap: number;
  /** Talus slope (px down per px across). */
  slope: number;
}

/** Flat top with a few notches, a sheer stepped cliff, then a spreading talus skirt. */
export const mesaTop = (m: Mesa, x: number, k: number): number => {
  const dx = Math.abs(wdx(x, m.x));
  if (dx <= m.w) {
    const notch = wave(x, 23 + k * 3, k) > 0.86 ? 1 : 0;
    return m.y + notch;
  }
  const out = dx - m.w;
  const cliff = out * 4 + (out > 1 ? 1 : 0);
  if (cliff < m.cap) return m.y + cliff;
  const run = out - m.cap / 4;
  return Math.round(m.y + m.cap + run * m.slope + 0.8 * wave(x, 37, k));
};

export interface MesaPal {
  lit: string;
  shade: string;
  band: string;
  rim: string;
  talus?: string;
}

/**
 * Paints a mesa range, the front-most last; each lit on its right (sun) side, with horizontal
 * strata bands across the cliff faces and a hot rim along the flat tops.
 */
export const paintMesas = (p: PixelPainter, mesas: Mesa[], pal: MesaPal, base: number): void => {
  for (let x = 0; x < TILE_W; x++)
    for (let y = 30; y < base; y++) {
      let owner = -1;
      for (let k = mesas.length - 1; k >= 0; k--)
        if (y >= mesaTop(mesas[k], x, k)) {
          owner = k;
          break;
        }
      if (owner < 0) continue;
      const m = mesas[owner];
      const top = mesaTop(m, x, owner);
      const dx = wdx(x, m.x);
      const dy = y - m.y;
      const lit = dx > m.w * 0.35 + dy * 0.12;
      let c = lit ? pal.lit : pal.shade;
      if (pal.talus && dy > m.cap + 1) c = lit ? pal.lit : pal.talus;
      // strata: a darker band every few rows of the cliff
      if (dy > 1 && dy <= m.cap && dy % 4 === 2) c = pal.band;
      // vertical erosion gullies in the cliff
      if (dy > 2 && dy <= m.cap && ((x * 7 + owner * 5) % 11 === 0)) c = pal.band;
      // silhouette: hot rim across the flat top and down the sunlit side, dark on the shade side
      if (y === top) c = Math.abs(dx) <= m.w || lit ? pal.rim : pal.band;
      p.px(x, y, c);
    }
};

// ---------------------------------------------------------------- props

/** A ponderosa pine: tiered, ragged boughs; 'a' rim light (right), 'b' body, 'c' shade, 't' trunk. */
export const pine = (h: number, w: number, seed: number): Grid => {
  const W = w | 1;
  const cx = (W - 1) / 2;
  const crownH = h - 3;
  const tiers = Math.max(3, Math.round(crownH / 6));
  const rows: string[] = [];
  for (let j = 0; j < crownH; j++) {
    const t = j / (crownH - 1);
    const tierPos = ((j * tiers) / crownH) % 1;
    const jag = ((j * 7 + seed * 3) % 5) - 2;
    let half = Math.round(cx * (0.12 + 0.88 * t) * (0.5 + 0.5 * tierPos) + (tierPos > 0.6 ? jag * 0.5 : 0));
    if (j < 2) half = 0;
    half = Math.max(0, Math.min(Math.floor(cx), half));
    let row = "";
    for (let i = 0; i < W; i++) {
      const dx = i - cx;
      if (Math.abs(dx) > half) row += ".";
      else if (dx === half && tierPos > 0.3 && half > 0) row += "a";
      else if (dx > 0 && tierPos < 0.25) row += "c";
      else row += dx < -half * 0.3 || tierPos < 0.2 ? "c" : "b";
    }
    rows.push(row);
  }
  for (let j = 0; j < 3; j++) rows.push(".".repeat(Math.floor(cx)) + "t" + ".".repeat(W - Math.floor(cx) - 1));
  return rows;
};

/** A saguaro: 'o' outline, 'l' lit rib, 'm' body, 'd' shade; arms on one or both sides. */
export const saguaro = (h: number, arms: number): Grid => {
  const W = 13;
  const rows: string[][] = [];
  for (let j = 0; j < h; j++) rows.push(new Array(W).fill("."));
  const trunk = (x0: number, y0: number, y1: number, wide: number): void => {
    for (let y = y0; y <= y1; y++)
      for (let i = 0; i < wide; i++) {
        let c = "m";
        if (i === 0) c = "d";
        else if (i === wide - 1) c = "l";
        else if (i === 1 && wide > 3) c = "d";
        rows[y][x0 + i] = c;
      }
  };
  const tx = 5;
  trunk(tx, 1, h - 1, 4);
  rows[0][tx + 1] = "m";
  rows[0][tx + 2] = "l";
  const arm = (side: number, y: number, len: number): void => {
    const ax = side < 0 ? 1 : 10;
    trunk(ax, y - len, y, 2);
    rows[y - len - 1][ax + (side < 0 ? 1 : 0)] = side < 0 ? "l" : "m";
    for (let i = 0; i < 3; i++) {
      const xx = side < 0 ? ax + 2 + i : ax - 1 - i;
      if (xx >= tx && xx < tx + 4) continue;
      rows[y][xx] = "d";
      rows[y + 1][xx] = "d";
    }
  };
  if (arms & 1) arm(-1, Math.round(h * 0.55), Math.round(h * 0.25));
  if (arms & 2) arm(1, Math.round(h * 0.45), Math.round(h * 0.28));
  // outline
  const g = rows.map((r) => r.join(""));
  return g.map((row, j) =>
    row
      .split("")
      .map((c, i) => {
        if (c !== ".") return c;
        const n = [g[j]?.[i - 1], g[j]?.[i + 1], g[j - 1]?.[i], g[j + 1]?.[i]];
        return n.some((v) => v && v !== "." && v !== "o") ? "o" : ".";
      })
      .join(""),
  );
};

/** Dry-grass clumps: 'd' dark root, 'l' sun-bleached tips. */
export const TUFTS: Grid[] = [
  ["l.l", "ddd"],
  ["..l..", "l.d.l", ".ddd."],
  ["..l...l", "l.d..d.", ".ddd.d.", "..dddd."],
  ["...l.....", "l..d...l.", ".d.d..d.l", ".dddd.dd.", "..ddddd.."],
];

/** Tuft size for a ground row. */
export const tuftFor = (y: number): Grid => {
  if (y < 124) return TUFTS[0];
  if (y < 136) return TUFTS[1];
  if (y < 156) return TUFTS[2];
  return TUFTS[3];
};

/** A weathered fence post with a sagging wire to the next one. */
export const fence = (p: PixelPainter, x0: number, x1: number, base: number, step: number, post: string, lit: string, wire: string): void => {
  for (let x = x0; x <= x1; x += step) {
    p.vline(x, base - 7, 8, post);
    p.vline(x + 1, base - 7, 8, lit);
    p.px(x, base - 8, post);
    if (x + step <= x1)
      for (let i = 2; i < step; i++) {
        const sag = Math.round(Math.sin((Math.PI * i) / step) * 1.4);
        p.px(x + i, base - 6 + sag, wire);
        p.px(x + i, base - 3 + sag, wire);
      }
  }
};
