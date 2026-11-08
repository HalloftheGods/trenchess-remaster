import type { Palette } from "../../palette";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";

/**
 * Shared pieces of the Tundra world's duel battlefields: the polar night sky fading to a pale
 * ice-blue horizon, green aurora curtains, icy peak ranges lit from the right, snowy firs and
 * the snow drifts and wind striae the five terrains reuse with their own palettes.
 */

// ---------------------------------------------------------------- helpers

/** Signed horizontal distance from `cx` to `x`, wrapped into [-TILE_W/2, TILE_W/2). */
export const wdx = (x: number, cx: number): number => ((((x - cx) % TILE_W) + TILE_W * 1.5) % TILE_W) - TILE_W / 2;

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

/** The stratum colour at row y. */
export const bandAt = (stops: [number, string][], y: number): string => {
  let c = stops[0][1];
  for (const [sy, sc] of stops) if (y >= sy) c = sc;
  return c;
};

/** Stamps a grid by its bottom-centre anchor. */
export const plant = (p: PixelPainter, g: Grid, cx: number, by: number, pal: Palette): void => {
  p.stamp(g, Math.round(cx - g[0].length / 2), by - g.length + 1, pal);
};

// ---------------------------------------------------------------- sky

/** Polar night overhead, through steel blue, to the pale ice horizon of the board's sky. */
export const NIGHT = ["#0a1428", "#0d1a32", "#10203c", "#132846", "#163050", "#1e3c5e", "#28486c", "#32587c", "#3a6a90", "#5684a8", "#749fc0", "#9ac4e0", "#bcdcec", "#e0f0f8"];

/** Fills the sky from 0 to `bottom` with the colour list as even dithered strata, then stars. */
export const paintNight = (p: PixelPainter, colors: string[], bottom: number, seed: number, stars = 60): void => {
  const step = bottom / colors.length;
  strata(
    p,
    colors.map((c, i) => [Math.round(i * step), c] as [number, string]),
    p.h,
    3,
  );
  p.reseed(seed);
  for (let i = 0; i < stars; i++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = Math.floor(p.rand() * p.rand() * bottom * 0.62);
    const k = p.rand();
    if (k > 0.94 && y < bottom * 0.4) {
      p.px(x, y, "#ffffff");
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) p.px(x + ox, y + oy, "#5a7aa8");
    } else p.px(x, y, k > 0.55 ? "#e0f0ff" : "#7890b8");
  }
};

export interface AuroraPal {
  edge: string;
  core: string;
  mid: string;
  tail: string;
}
export const AURORA: AuroraPal = { edge: "#c8ffe4", core: "#5affb0", mid: "#30c08c", tail: "#2a7a8a" };

/** One aurora curtain: its bright lower edge snakes along `y`, rays rise `len` px above it. */
export interface Curtain {
  /** Centre of the curtain (it fades out towards `cx +- half`). */
  cx: number;
  half: number;
  y: number;
  amp: number;
  /** Whole waves of the edge across the tile. */
  n: number;
  phase: number;
  len: number;
}

const rayLen = (x: number, c: Curtain): number => {
  const r = 0.55 * wave(x, 7, c.phase) + 0.3 * wave(x, 13, c.phase * 1.3) + 0.15 * wave(x, 41, c.phase * 0.3);
  const d = Math.abs(wdx(x, c.cx)) / c.half;
  const env = Math.max(0, 1 - d * d);
  return Math.round(c.len * env * (0.65 + 0.35 * r));
};

/**
 * Aurora curtains: a 1px pale edge, a solid green core, then rays that thin out upward with
 * ordered dither from green through teal into the night. A few brighter rays run higher.
 */
export const paintAurora = (p: PixelPainter, curtains: Curtain[], pal: AuroraPal = AURORA): void => {
  for (const c of curtains)
    for (let x = 0; x < TILE_W; x++) {
      const len = rayLen(x, c);
      if (len < 3) continue;
      const y0 = Math.round(c.y + c.amp * wave(x, c.n, c.phase) + c.amp * 0.3 * wave(x, c.n * 2 + 1, c.phase * 2));
      const bright = wave(x, 31, c.phase) > 0.55 ? 0.14 : 0;
      for (let k = 0; k < len; k++) {
        const t = k / len - bright;
        const y = y0 - k;
        if (k === 0) p.px(x, y, pal.edge);
        else if (t < 0.16) p.px(x, y, pal.core);
        else if (t < 0.36) {
          p.px(x, y, pal.mid);
          p.dither(x, y, 1, 1, pal.core, Math.round(16 * (1 - (t - 0.16) / 0.2)));
        } else if (t < 0.62) p.dither(x, y, 1, 1, pal.mid, Math.round(14 * (1 - (t - 0.36) / 0.26)) + 2);
        else p.dither(x, y, 1, 1, pal.tail, Math.round(8 * (1 - (t - 0.62) / 0.38)) + 1);
      }
    }
};

// ---------------------------------------------------------------- peaks

export interface Peak {
  x: number;
  /** Apex row. */
  y: number;
  /** Rows down per px across. */
  s: number;
  /** Depth of the snow cap below the apex. */
  snow: number;
  /** Rows between slanted snow ledges down the rock (crags), if any. */
  ledge?: number;
}
export interface PeakPal {
  lit: string;
  shade: string;
  snow: string;
  snowShade: string;
  rim: string;
}

export const peakTop = (pk: Peak, x: number, k: number): number => {
  const dx = Math.abs(wdx(x, pk.x));
  const jag = Math.round(1.6 * wave(x, 19 + k * 4, k) + 0.8 * wave(x, 43, k * 2));
  return pk.y + dx * pk.s + jag * Math.min(1, dx / 5);
};

/**
 * An icy range, front-most last. Each peak is lit on its right of a wobbling crest line, with a
 * ragged snow cap and snow streaks running down the gullies.
 */
export const paintPeaks = (p: PixelPainter, peaks: Peak[], pal: PeakPal, base: number): void => {
  for (let x = 0; x < TILE_W; x++)
    for (let y = 0; y < base; y++) {
      let owner = -1;
      for (let k = peaks.length - 1; k >= 0; k--)
        if (y >= peakTop(peaks[k], x, k)) {
          owner = k;
          break;
        }
      if (owner < 0) continue;
      const pk = peaks[owner];
      const dx = wdx(x, pk.x);
      const dy = y - pk.y;
      const crest = Math.round(2 * Math.sin(dy * 0.22 + owner) + dy * 0.08);
      const lit = dx > crest;
      const snowLine = pk.snow + 3 * wave(x, 13, owner) + 2 * wave(x, 29, owner * 3);
      const g = (x * 7 + owner * 3) % 17;
      const gully = !lit && g < 1 && dy < snowLine + 4 + ((x * 5) % 7);
      const ledgeRow = pk.ledge ? (dy + Math.round(Math.abs(dx) * 0.5) + owner * 3) % pk.ledge : 1;
      const ledge = ledgeRow === 0 && dy > snowLine && wave(x * 3 + dy * 5, 7, owner) > 0;
      const snowy = dy < snowLine || gully || ledge;
      let c: string;
      if (snowy) c = lit ? pal.snow : pal.snowShade;
      else c = lit ? pal.lit : pal.shade;
      if (y === Math.round(peakTop(pk, x, owner)) && lit) c = pal.rim;
      p.px(x, y, c);
    }
};

// ---------------------------------------------------------------- firs

/**
 * A snowy fir: drooping tiers that widen downward, snow lying 1-2px deep wherever a bough is
 * open to the sky. 's' lit snow (right), 'S' shaded snow, 'b' lit needles, 'c' shade, 't' trunk.
 */
export const fir = (h: number, w: number, seed: number, snowDepth = 2): Grid => {
  const W = w | 1;
  const cx = (W - 1) / 2;
  const crownH = h - 2;
  const tiers = Math.max(3, Math.round(crownH / 10));
  const mask: boolean[][] = [];
  for (let j = 0; j < crownH; j++) {
    const t = j / (crownH - 1);
    const tierPos = ((j * tiers) / crownH) % 1;
    const jag = ((j * 5 + seed * 3) % 3) - 1;
    let half = Math.round(cx * (0.08 + 0.92 * t) * (0.3 + 0.7 * tierPos ** 1.8) + (tierPos > 0.7 ? jag * 0.5 : 0));
    if (j < 1) half = 0;
    half = Math.max(0, Math.min(Math.floor(cx), half));
    const row: boolean[] = [];
    for (let i = 0; i < W; i++) row.push(Math.abs(i - cx) <= half);
    mask.push(row);
  }
  const rows: string[] = [];
  for (let j = 0; j < crownH; j++) {
    let row = "";
    for (let i = 0; i < W; i++) {
      if (!mask[j][i]) {
        row += ".";
        continue;
      }
      const dx = i - cx;
      let open = false;
      for (let k = 1; k <= snowDepth; k++) if (j - k < 0 || !mask[j - k][i]) open = true;
      const under = j + 1 < crownH && !mask[j + 1][i];
      if (open) row += dx >= 0 ? "s" : "S";
      else if (under) row += "c";
      else row += dx > -1 ? "b" : "c";
    }
    rows.push(row);
  }
  for (let j = 0; j < 2; j++) rows.push(".".repeat(Math.floor(cx)) + "t" + ".".repeat(W - Math.floor(cx) - 1));
  return rows;
};

/** A row of firs along a base line, spread over the tile with jitter. */
export const firRow = (p: PixelPainter, pal: Palette, base: number, count: number, hMin: number, hMax: number, snowDepth = 1): void => {
  for (let i = 0; i < count; i++) {
    const x = Math.round((i / count) * TILE_W + p.rand() * (TILE_W / count) * 0.7);
    const h = Math.round(hMin + p.rand() * (hMax - hMin));
    plant(p, fir(h, Math.round(h * 0.5), i, snowDepth), x, base + Math.round(p.rand() * 2), pal);
  }
};

/** A distant fir only a few px tall: a narrow cone banded with snow every few rows. */
export const tinyFir = (p: PixelPainter, x: number, base: number, h: number, pal: Palette): void => {
  const w = Math.round(h * 0.55) | 1;
  for (let j = 0; j < h - 1; j++) {
    const t = j / (h - 2);
    const tier = (j * 3) % 4;
    const half = Math.round(((w - 1) / 2) * t * (0.6 + 0.13 * tier));
    for (let i = -half; i <= half; i++) {
      let c = i >= 0 ? pal.b : pal.c;
      if (tier === 0 && j > 0) c = i >= 0 ? pal.s : pal.S;
      if (j === 0) c = pal.s;
      p.px(x + i, base - h + j, c);
    }
  }
  p.px(x, base - 1, pal.t);
};

// ---------------------------------------------------------------- snow

export interface DriftPal {
  rim: string;
  body: string;
  shade: string;
}

/** A rolling snow bank filling down to the bottom: white rim, body, and a blue shade on its left slopes. */
export const snowBank = (p: PixelPainter, top: (x: number) => number, pal: DriftPal, bottom = p.h): void => {
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(top(x));
    // faces turned left (rising to the right) are in shade; light comes from the right
    const slope = top(x + 3) - top(x - 3);
    p.vline(x, t, bottom - t, pal.body);
    if (slope < -0.6) p.vline(x, t + 1, Math.min(bottom - t - 1, 2 + Math.round(-slope)), pal.shade);
    p.px(x, t, slope < -0.6 ? pal.body : pal.rim);
  }
};

/** Wind striae: short horizontal streaks, sparse and thin far, longer and spaced near. */
export const striae = (p: PixelPainter, y0: number, y1: number, color: (y: number) => string, seed: number): void => {
  p.reseed(seed);
  for (let y = y0; y < y1; ) {
    const d = y - y0;
    const n = Math.max(3, Math.round(12 - d * 0.2));
    for (let i = 0; i < n; i++) {
      if (p.rand() < 0.35) continue;
      const x = Math.round((i / n) * TILE_W + p.rand() * (TILE_W / n));
      const len = Math.round(4 + d * 0.5 + p.rand() * (6 + d * 0.4));
      p.hline(x, y, len, color(y));
    }
    y += 3 + Math.floor(d / 6);
  }
};

/** Single-pixel glints scattered over a band. */
export const glints = (p: PixelPainter, y0: number, y1: number, count: number, c: string, seed: number): void => {
  p.reseed(seed);
  for (let i = 0; i < count; i++) p.px(Math.floor(p.rand() * TILE_W), Math.floor(y0 + p.rand() * (y1 - y0)), c);
};

/** A grey boulder with a snow cap: 'o' outline-dark, 'd' shade, 'm' body, 'l' lit (right), 's' snow, 'S' snow shade. */
export const boulder = (rx: number, ry: number, capped: boolean): Grid => {
  const rows: string[] = [];
  for (let j = -ry; j <= ry; j++) {
    let row = "";
    for (let i = -rx - 1; i <= rx + 1; i++) {
      const lobe = 1 + 0.12 * Math.sin(i * 1.3 + j * 0.7);
      const e = (i / rx) ** 2 + (j / ry) ** 2;
      if (j > ry * 0.55 || e > lobe) {
        row += j > ry * 0.55 && e <= lobe * 1.15 && Math.abs(i) <= rx ? "o" : ".";
        continue;
      }
      const l = 0.6 * (i / rx) - 0.8 * (j / ry);
      let c = "m";
      if (e > lobe * 0.78 && l < 0) c = "o";
      else if (l > 0.45) c = "l";
      else if (l < -0.25) c = "d";
      if (capped && j < -ry * 0.35 + 0.6 * Math.sin(i * 0.9)) c = i >= 0 ? "s" : "S";
      row += c;
    }
    rows.push(row);
  }
  return rows;
};
