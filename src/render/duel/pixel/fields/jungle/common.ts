import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { mix, type Palette } from "../../palette";

/**
 * Shared pieces for the Jungle battlefields: the steamy green-to-gold sky with a low sun (the
 * board's jungle sky), layered rounded canopy lines, stepped temple silhouettes, hanging vines,
 * grass tufts and dark foreground fronds. Every shape wraps at TILE_W.
 */

/** The board sky (#0e2a18 at the top down to #f0d888 at the horizon) as hard bands. */
export const SKY = ["#0e2a18", "#132f1c", "#183a22", "#1e4a2a", "#2c5a30", "#3c6a36", "#4a7a3a", "#628a40", "#7c9846", "#a0a850", "#c2bc66", "#dccb78", "#f0d888"];
export const SUN = { halo: "#e4d27e", ring: "#f2e090", inner: "#fff0a0", core: "#fffbe0" };

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

/** The strata colour at row y. */
export const bandAt = (stops: [number, string][], y: number): string => {
  let c = stops[0][1];
  for (const [sy, sc] of stops) if (y >= sy) c = sc;
  return c;
};

/** Signed horizontal distance from `cx` to `x`, wrapped into [-TILE_W/2, TILE_W/2). */
export const wdx = (x: number, cx: number): number => ((((x - cx) % TILE_W) + TILE_W * 1.5) % TILE_W) - TILE_W / 2;

/** Stamps a grid by its bottom-centre anchor. */
export const plant = (p: PixelPainter, g: Grid, cx: number, by: number, pal: Palette): void => {
  p.stamp(g, Math.round(cx - g[0].length / 2), by - g.length + 1, pal);
};

// ---------------------------------------------------------------- sky

export interface SkyOpts {
  /** Sun centre. */
  sunX: number;
  sunY: number;
  /** Bottom of the band ramp (the colour below it is the last band). */
  horizon: number;
  /** Bands to drop from the top or bottom of the ramp (a darker or a brighter sky). */
  from?: number;
  to?: number;
  stars?: number;
}

/** The jungle sky: deep green above, gold at the horizon, a hazy low sun and a few dim stars. */
export const jungleSky = (p: PixelPainter, o: SkyOpts): void => {
  const ramp = SKY.slice(o.from ?? 0, o.to ?? SKY.length);
  p.bands(0, o.horizon, ramp, 3);
  p.rect(0, o.horizon, p.w, p.h - o.horizon, ramp[ramp.length - 1]);
  p.reseed(71);
  for (let k = 0; k < (o.stars ?? 14); k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 21 + Math.floor(p.rand() * 22);
    p.px(x, y, p.rand() > 0.7 ? "#7a9a70" : "#4a6a4a");
  }
  const rings: [number, string][] = [
    [22, SUN.halo],
    [15, SUN.ring],
    [10, SUN.inner],
    [6, SUN.core],
  ];
  for (const [r, c] of rings) p.disc(o.sunX, o.sunY, r, c);
};

/** Long flat haze streaks (for a drifting layer): each a clean two-row sliver with a lit top. */
export const hazeStreaks = (p: PixelPainter, streaks: [number, number, number][], hi: string, lo: string): void => {
  for (const [x, y, len] of streaks) {
    p.hline(x + 6, y, len - 14, hi);
    p.hline(x, y + 1, len, lo);
    p.hline(x + 10, y + 2, Math.max(4, len - 24), lo);
  }
};

/** A soft rolling hill line with a 1px lit rim, filled down to `bottom`. */
export const hills = (p: PixelPainter, top: (x: number) => number, fill: string, rim: string, bottom = p.h): void => {
  p.ridge(top, fill, bottom);
  for (let x = 0; x < p.w; x++) {
    const t = Math.round(top(x));
    if (Math.round(top(x - 1)) >= t) p.px(x, t, rim);
  }
};

// ---------------------------------------------------------------- canopy

export interface Crown {
  x: number;
  y: number;
  r: number;
}

export interface CanopyPal {
  /** Lit rim, lit face, mid, shade, and the solid fill below the crowns. */
  rim: string;
  lit: string;
  mid: string;
  shade: string;
  fill: string;
}

/** A jittered row of round crowns along `base`, every one wrapping across the seam. */
export const crownRow = (p: PixelPainter, seed: number, base: number, step: number, rMin: number, rMax: number, lift: number): Crown[] => {
  p.reseed(seed);
  const out: Crown[] = [];
  for (let x = 0; x < TILE_W; x += step) {
    const r = Math.round(rMin + p.rand() * (rMax - rMin));
    const y = base - Math.round(p.rand() * lift + 3 * wave(x, 2, seed));
    out.push({ x: x + Math.round(p.rand() * step * 0.5), y, r });
  }
  return out;
};

/**
 * A canopy wall of lumpy round crowns, filled solid below them down to `bottom`. The lower
 * crown in front owns each pixel; shading uses that crown's normal against the top-left light.
 */
export const canopy = (p: PixelPainter, crowns: Crown[], pal: CanopyPal, bottom: number, solid = true): void => {
  const floor = solid ? Math.max(...crowns.map((c) => c.y)) : bottom;
  for (let x = 0; x < TILE_W; x++) {
    let top = floor;
    for (const c of crowns) {
      const dx = wdx(x, c.x);
      if (Math.abs(dx) > c.r) continue;
      const h = Math.floor(Math.sqrt(c.r * c.r + c.r * 0.6 - dx * dx));
      top = Math.min(top, c.y - h);
    }
    for (let y = top; y < bottom; y++) {
      let own: Crown | null = null;
      for (const c of crowns) {
        const dx = wdx(x, c.x);
        if (dx * dx + (y - c.y) ** 2 <= c.r * c.r + c.r * 0.6 && (!own || c.y > own.y)) own = c;
      }
      if (!own) {
        p.px(x, y, pal.fill);
        continue;
      }
      const l = -0.6 * (wdx(x, own.x) / own.r) - 0.8 * ((y - own.y) / own.r);
      p.px(x, y, crownTone(l, pal));
    }
    if (top < bottom) p.px(x, top, pal.rim);
  }
};

const crownTone = (l: number, pal: CanopyPal): string => {
  if (l > 0.62) return pal.rim;
  if (l > 0.2) return pal.lit;
  if (l > -0.35) return pal.mid;
  return pal.shade;
};

/** A palm: a thin curved trunk with a crown of drooping fronds, all in one or two flat colours. */
export const palm = (p: PixelPainter, x: number, base: number, h: number, lean: number, trunk: string, leaf: string): void => {
  let tx = x;
  let ty = base;
  for (let j = 0; j < h; j++) {
    tx = x + Math.round(lean * (j / h) ** 2);
    ty = base - j;
    p.px(tx, ty, trunk);
    p.px(tx + 1, ty, trunk);
  }
  const fronds: [number, number][] = [
    [-1, 0.2],
    [1, 0.25],
    [-1, 0.7],
    [1, 0.8],
    [-0.4, -0.2],
    [0.5, -0.1],
  ];
  for (const [dir, droop] of fronds) {
    const len = 9 + Math.round(Math.abs(dir) * 4);
    for (let i = 0; i <= len; i++) {
      const t = i / len;
      const fx = Math.round(tx + dir * i);
      const fy = Math.round(ty - 3 * Math.sin(Math.PI * t * 0.7) + droop * t * t * 9);
      p.px(fx, fy, leaf);
      if (t < 0.8 && i % 2 === 0) p.px(fx, fy + 1, leaf);
    }
  }
  p.px(tx, ty - 1, leaf);
  p.px(tx + 1, ty - 1, leaf);
};

// ---------------------------------------------------------------- temple

export interface TemplePal {
  lit: string;
  face: string;
  shade: string;
  moss: string;
  dark: string;
}

/**
 * A stepped temple (ziggurat): `tiers` stacked blocks, each narrower, with a central stair,
 * a lit left edge, a shade right face, moss along each step and a dark shrine door on top.
 */
export const ziggurat = (p: PixelPainter, cx: number, base: number, w: number, tierH: number, tiers: number, pal: TemplePal): void => {
  const inset = Math.floor(w / (tiers * 2 + 2));
  for (let t = 0; t < tiers; t++) {
    const tw = w - t * inset * 2;
    const x0 = cx - Math.floor(tw / 2);
    const y0 = base - (t + 1) * tierH;
    p.rect(x0, y0, tw, tierH, pal.face);
    p.rect(x0 + tw - Math.max(2, Math.floor(inset * 0.8)), y0, Math.max(2, Math.floor(inset * 0.8)), tierH, pal.shade);
    p.vline(x0, y0, tierH, pal.lit);
    p.hline(x0, y0, tw, pal.lit);
    // moss draped along the step lip
    for (let i = 0; i < tw; i++) {
      const drip = (i * 7 + t * 3) % 11 < 3 ? 2 : 1;
      if ((i * 5 + t) % 9 < 6) p.vline(x0 + i, y0, drip, pal.moss);
    }
    // a dark joint between courses
    if (tierH >= 6) p.hline(x0 + 1, y0 + Math.floor(tierH / 2), tw - 2, pal.shade);
  }
  // the central stair
  const sw = Math.max(3, Math.floor(w / 7));
  const top = base - tiers * tierH;
  for (let y = top; y < base; y++) {
    p.hline(cx - Math.floor(sw / 2), y, sw, (y - top) % 2 === 0 ? pal.lit : pal.face);
  }
  // shrine on top with its doorway
  const shw = Math.max(5, w - tiers * inset * 2 - 2);
  const shh = Math.max(4, Math.round(tierH * 1.3));
  p.rect(cx - Math.floor(shw / 2), top - shh, shw, shh, pal.face);
  p.hline(cx - Math.floor(shw / 2) - 1, top - shh, shw + 2, pal.lit);
  p.vline(cx - Math.floor(shw / 2), top - shh, shh, pal.lit);
  const dw = Math.max(1, Math.floor(shw / 3));
  p.rect(cx - Math.floor(dw / 2), top - shh + 2, dw, shh - 2, pal.dark);
};

// ---------------------------------------------------------------- vines and plants

/** Hanging vines: [x, top, length]; a 1px swaying strand with leaf pairs. */
export const vines = (p: PixelPainter, list: [number, number, number][], stem: string, leaf: string): void => {
  for (const [vx, y0, len] of list) {
    for (let j = 0; j < len; j++) {
      const x = vx + Math.round(Math.sin(j * 0.16 + vx) * 1.3);
      p.px(x, y0 + j, stem);
      if (j % 6 === 3) {
        p.px(x - 1, y0 + j, leaf);
        p.px(x - 2, y0 + j - 1, leaf);
      }
      if (j % 6 === 0 && j > 0) {
        p.px(x + 1, y0 + j, leaf);
        p.px(x + 2, y0 + j - 1, leaf);
      }
    }
    const ex = vx + Math.round(Math.sin(len * 0.16 + vx) * 1.3);
    p.px(ex, y0 + len, leaf);
    p.px(ex - 1, y0 + len + 1, leaf);
    p.px(ex + 1, y0 + len + 1, leaf);
  }
};

/** Grass tufts in three sizes: 'l' lit tip, 'm' lit blade, 'd' shaded blade, 's' root shadow. */
const TUFTS: Grid[] = [
  [".l..l", "lm.md", "mmdmd", ".sss."],
  ["..l...l..", "l.m..lm.l", "mlm.lmd.d", "mmmdmmdmd", ".mmddmdd.", "..sssss.."],
  [
    "......l......",
    "..l...m...l..",
    "..m..lm..lm..",
    "l.ml.mm.lmd.l",
    "m.mm.mmdmmd.d",
    "mlmmdmmdmmdld",
    "mmmmdmmddmdmd",
    ".mmdddmdddmd.",
    "..sssssssss..",
  ],
];

export interface TuftTone {
  tip: string;
  blade: string;
  dark: string;
}

/** One grass tuft tinted toward the ground colour beneath it. */
export const tuft = (p: PixelPainter, cx: number, y: number, size: number, base: string, tone: TuftTone): void => {
  const g = TUFTS[size];
  const pal: Palette = {
    l: mix(base, tone.tip, 0.5),
    m: mix(base, tone.blade, 0.4),
    d: mix(base, tone.dark, 0.35),
    s: mix(base, tone.dark, 0.2),
  };
  p.stamp(g, cx - Math.floor(g[0].length / 2), y - g.length + 1, pal);
};

export const tuftSize = (d: number): number => {
  if (d < 10) return 0;
  if (d < 26) return 1;
  return 2;
};

/** Scatters tufts in perspective rows from `y0` down: sparse and small far, bigger near. */
export const tuftField = (p: PixelPainter, seed: number, y0: number, skip: number, colorAt: (y: number) => string, tone: TuftTone, keep: (x: number, y: number) => boolean = () => true): void => {
  p.reseed(seed);
  for (let y = y0; y < p.h; ) {
    const d = y - y0 + 4;
    const spacing = 24 + d * 1.6;
    const n = Math.max(3, Math.round(TILE_W / spacing));
    const phase = p.rand() * spacing;
    for (let i = 0; i < n; i++) {
      if (p.rand() < skip) continue;
      const cx = Math.round(phase + (i / n) * TILE_W + (p.rand() - 0.5) * spacing * 0.6);
      if (!keep(cx, y)) continue;
      const size = tuftSize(d);
      tuft(p, cx, y, size, colorAt(y), tone);
      if (size > 0 && p.rand() < 0.5) tuft(p, cx + (size === 2 ? 9 : 6), y + 1, size - 1, colorAt(y + 1), tone);
    }
    y += 4 + Math.floor(d / 4);
  }
};

/** One arching frond as a flat silhouette with feathered leaflets and a lit tip on each. */
export const frond = (p: PixelPainter, x0: number, y0: number, len: number, dir: number, rise: number, body: string, lit: string): void => {
  for (let i = 0; i <= len; i++) {
    const t = i / len;
    const x = Math.round(x0 + dir * i);
    const y = Math.round(y0 - rise * Math.sin(Math.PI * t * 0.85));
    p.px(x, y, body);
    p.px(x, y + 1, body);
    if (i % 2 === 0 && t > 0.06 && t < 0.97) {
      const leaf = Math.max(1, Math.round((1 - t) * 6));
      for (let k = 1; k <= leaf; k++) {
        const fx = x + dir * Math.floor(k / 2);
        p.px(fx, y - k, body);
        p.px(fx + dir, y - k, body);
        p.px(fx, y + 1 + k, body);
        p.px(fx + dir, y + 1 + k, body);
      }
      p.px(x + dir * Math.floor(leaf / 2), y - leaf - 1, lit);
    }
  }
};

/** A clump of four fronds rooted near the bottom edge. */
export const frondClump = (p: PixelPainter, cx: number, s: number, body: string, lit: string): void => {
  frond(p, cx, 175, Math.round(26 * s), -1, Math.round(8 * s), body, lit);
  frond(p, cx + 2, 174, Math.round(30 * s), 1, Math.round(9 * s), body, lit);
  frond(p, cx - 4, 178, Math.round(20 * s), -1, Math.round(5 * s), body, lit);
  frond(p, cx + 6, 178, Math.round(22 * s), 1, Math.round(5 * s), body, lit);
};

/** A broad elephant-ear leaf (for the foreground): a teardrop with a midrib, pointing up-out. */
export const bigLeaf = (p: PixelPainter, x: number, y: number, len: number, dir: number, body: string, rib: string): void => {
  for (let i = 0; i <= len; i++) {
    const t = i / len;
    const half = Math.round(Math.sin(Math.PI * Math.min(1, t * 1.15)) * len * 0.28);
    const cx = Math.round(x + dir * i * 0.7);
    const cy = Math.round(y - i * 0.75 + t * t * len * 0.35);
    p.vline(cx, cy - half, half * 2 + 1, body);
    p.px(cx, cy, rib);
  }
};

/** Tiny jungle flowers: 'p' petal, 'c' centre. */
export const BLOOM: Grid = [".p.", "pcp", ".p."];

/** Only the crowns themselves (no fill below): for free-standing trees. */
export const crownCluster = (p: PixelPainter, crowns: Crown[], pal: CanopyPal): void => {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const c of crowns) {
    x0 = Math.min(x0, c.x - c.r - 1);
    x1 = Math.max(x1, c.x + c.r + 1);
    y0 = Math.min(y0, c.y - c.r - 1);
    y1 = Math.max(y1, c.y + c.r + 1);
  }
  for (let x = x0; x <= x1; x++) {
    let top = true;
    for (let y = y0; y <= y1; y++) {
      let own: Crown | null = null;
      for (const c of crowns) if ((x - c.x) ** 2 + (y - c.y) ** 2 <= c.r * c.r + c.r * 0.6 && (!own || c.y > own.y)) own = c;
      if (!own) continue;
      const l = -0.6 * ((x - own.x) / own.r) - 0.8 * ((y - own.y) / own.r);
      p.px(x, y, top ? pal.rim : crownTone(l, pal));
      top = false;
    }
  }
};

/** A lily pad: a flat ellipse with a notch, a lit far rim and an optional white flower. */
export const lily = (p: PixelPainter, cx: number, cy: number, rx: number, pad: string, lit: string, dark: string, flower: string | null): void => {
  const ry = Math.max(1, Math.round(rx / 3));
  p.ellipse(cx, cy, rx, ry, pad);
  p.hline(cx - rx + 2, cy - ry, Math.max(1, rx * 2 - 3), lit);
  p.hline(cx - rx + 1, cy + ry, Math.max(1, rx * 2 - 1), dark);
  // the notch: a dark wedge cut toward the viewer
  p.px(cx + 1, cy, dark);
  p.px(cx + 2, cy + 1, dark);
  if (rx > 4) p.px(cx + 3, cy + 1, dark);
  if (!flower) return;
  p.px(cx - 1, cy - 2, flower);
  p.px(cx + 1, cy - 2, flower);
  p.px(cx - 2, cy - 1, flower);
  p.px(cx + 2, cy - 1, flower);
  p.px(cx, cy - 3, flower);
  p.px(cx, cy - 1, "#f0d060");
  p.px(cx - 1, cy - 1, flower);
  p.px(cx + 1, cy - 1, flower);
};

/** A reed clump: a fan of 1px blades of mixed height, some topped with a seed head. */
export const reedClump = (p: PixelPainter, cx: number, base: number, h: number, light: string, dark: string, head: string): void => {
  const blades = [-4, -2, -1, 0, 1, 3, 5];
  blades.forEach((dx, i) => {
    const bh = Math.round(h * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.7 + cx))));
    const lean = dx * 0.12;
    for (let j = 0; j < bh; j++) p.px(Math.round(cx + dx + lean * j), base - j, i % 2 === 0 ? light : dark);
    if (i % 3 === 1) {
      const tx = Math.round(cx + dx + lean * bh);
      p.vline(tx, base - bh - 3, 4, head);
    }
  });
};
