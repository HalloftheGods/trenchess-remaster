import type { Battlefield } from "../field";
import { TILE_W, wave, type PixelPainter } from "../painter";
import type { Grid } from "../sheet";
import type { Palette } from "../palette";

/**
 * "The Iron Peaks": cold, crisp, high altitude. A deep blue-violet sky with a pale moon and a few
 * stars, a far range of jagged snow-capped peaks, nearer iron-grey crags with snow on
 * their ledges, and a rocky plateau floor with slabs, cracks, stones and patches of snow.
 */

// ---------------------------------------------------------------- palettes
const SKY = ["#1a163e", "#211c4c", "#29245a", "#322c68", "#3c3676", "#484284", "#565192", "#6662a0", "#7774ae", "#8a88bc"];
const MOON = { lit: "#eceaf8", shade: "#b6b4d8", crater: "#d0cee8", halo: "#4a4588", halo2: "#3e3a7c" };
const STAR = { hi: "#ffffff", mid: "#c6c4ee", lo: "#8c88cc" };
const CIRRUS = { hi: "#a4a2d4", mid: "#8a87c4", lo: "#726eb2" };

const BACK = { lit: "#9896cc", shade: "#8a88c0", snow: "#d4d4f0", snowShade: "#b8b8e2", haze: "#a2a0d2" };
const FAR = { rim: "#9e9cd0", lit: "#8482bc", shade: "#6e6ca8", deep: "#605e9a", snow: "#f2f2ff", snowShade: "#bcbce6", snowDeep: "#a2a2d6", haze: "#9a98cc", hazeLit: "#aaa8d8" };

const CRAG = { rim: "#8c8ca8", lit: "#706f8c", mid: "#5c5b78", shade: "#4a4964", deep: "#383750", snow: "#e2e4f6", snowShade: "#a8acd2", mist: "#8684b2", fogLit: "#9a98c6" };

const GROUND = ["#8f8ba6", "#84809b", "#787490", "#6c6884", "#615d78", "#55516c"];
const GSTOP = [112, 117, 123, 131, 145, 161];
const GR = { lip: "#a6a2bc", seam: "#4a465e", seamLit: "#9a96b0", crack: "#3a364c", crackLit: "#a29eb8" };
const SNOW = { hi: "#eceffc", mid: "#ccd0ec", lo: "#a2a6d0", edge: "#4e4a66" };
const STONE: Palette = { o: "#2e2a40", d: "#4c4862", m: "#68647e", l: "#8a86a0", h: "#aeaac4", s: "#e8ebfa", t: "#b4b8da" };

// ---------------------------------------------------------------- helpers

/** Signed horizontal distance from `px` to `x`, wrapped into [-TILE_W/2, TILE_W/2). */
const wdx = (x: number, px: number): number => ((((x - px) % TILE_W) + TILE_W * 1.5) % TILE_W) - TILE_W / 2;

/** Horizontal strata with explicit seam rows and a short ordered-dither blend at each seam. */
const strata = (p: PixelPainter, stops: [number, string][], bottom: number, blend = 3): void => {
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

const groundAt = (y: number): number => {
  let i = 0;
  while (i + 1 < GSTOP.length && y >= GSTOP[i + 1]) i++;
  return i;
};

// ---------------------------------------------------------------- sky
const STARS: [number, number, number][] = [
  [12, 18, 0], [37, 27, 1], [58, 16, 0], [96, 22, 2], [118, 41, 0], [141, 17, 1], [163, 30, 0], [188, 20, 0],
  [204, 44, 1], [229, 15, 0], [251, 26, 2], [274, 38, 0], [296, 19, 1], [312, 33, 0], [82, 47, 0], [178, 52, 0],
  [26, 50, 0], [242, 56, 0], [130, 25, 0], [287, 51, 0],
];

const paintSky = (p: PixelPainter): void => {
  const stops: [number, string][] = SKY.map((c, i) => [Math.round(i * 10.5), c]);
  strata(p, stops, 120, 4);
  // stars: mostly single dim points, a few brighter crosses
  for (const [x, y, k] of STARS) {
    if (k === 2) {
      p.px(x, y, STAR.hi);
      p.px(x - 1, y, STAR.lo);
      p.px(x + 1, y, STAR.lo);
      p.px(x, y - 1, STAR.lo);
      p.px(x, y + 1, STAR.lo);
    } else p.px(x, y, k === 1 ? STAR.mid : STAR.lo);
  }
  // a pale gibbous moon with a dithered halo; lit from the upper left
  const mx = 236, my = 32, r = 7;
  for (let y = -12; y <= 12; y++)
    for (let x = -12; x <= 12; x++) {
      const d2 = x * x + y * y;
      if (d2 <= 11.5 * 11.5 && d2 > 9.5 * 9.5 && ((x + y) & 1) === 0) p.px(mx + x, my + y, MOON.halo2);
      if (d2 <= 9.5 * 9.5 && d2 > (r + 0.5) * (r + 0.5)) p.px(mx + x, my + y, MOON.halo);
    }
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y > (r + 0.4) * (r + 0.4)) continue;
      const lx = x + 3, ly = y + 2;
      p.px(mx + x, my + y, lx * lx + ly * ly <= (r + 0.6) * (r + 0.6) ? MOON.lit : MOON.shade);
    }
  for (const [x, y] of [[-3, -2], [-2, -2], [-3, -1], [1, 2], [2, 2], [0, -4], [-1, 3]] as [number, number][]) p.px(mx + x, my + y, MOON.crater);
};

/** Thin high cirrus streaks: a bright core line with longer, darker lines trailing under it. */
const CIRRI: [number, number, number][] = [
  [20, 62, 34], [96, 74, 22], [150, 58, 40], [228, 70, 30], [276, 82, 24], [60, 86, 18], [186, 90, 26],
];

const paintCirrus = (p: PixelPainter): void => {
  for (const [x, y, len] of CIRRI) {
    p.hline(x + 6, y - 1, Math.round(len * 0.45), CIRRUS.mid);
    p.hline(x, y, len, CIRRUS.hi);
    p.hline(x - 7, y + 1, len + 4, CIRRUS.mid);
    p.hline(x - 12, y + 2, Math.round(len * 0.6), CIRRUS.lo);
    p.hline(x + len - 2, y + 2, 8, CIRRUS.lo);
  }
};

// ---------------------------------------------------------------- far peaks
interface Peak {
  x: number;
  y: number;
  sl: number; // left slope (px down per px across)
  sr: number; // right slope
  ridge: number; // lean of the shading ridge line
  snow: number; // depth of the snow cap
}

const peakTop = (pk: Peak, x: number, k: number): number => {
  const dx = wdx(x, pk.x);
  const s = dx < 0 ? pk.sl : pk.sr;
  let t = pk.y + Math.abs(dx) * s;
  // shoulders and notches on the flanks, never on the tip
  if (Math.abs(dx) > 4) t += 2.2 * wave(x, 13 + k * 2, k * 1.3) + 1.2 * wave(x, 31 + k, k * 0.7);
  return Math.round(t);
};

/** Paints a range of peaks, front-most last, each lit on its left face. */
const paintRange = (
  p: PixelPainter,
  peaks: Peak[],
  col: { lit: string; shade: string; snow: string; snowShade: string; rim?: string; snowDeep?: string },
  base: number,
): void => {
  for (let x = 0; x < TILE_W; x++) {
    for (let y = 0; y < base; y++) {
      // front-most peak that contains this pixel
      let owner = -1;
      for (let k = peaks.length - 1; k >= 0; k--)
        if (y >= peakTop(peaks[k], x, k)) {
          owner = k;
          break;
        }
      if (owner < 0) continue;
      const pk = peaks[owner];
      const top = peakTop(pk, x, owner);
      const dy = y - pk.y;
      const div = Math.round(pk.ridge * dy + (Math.floor(dy / 6) % 2));
      const lit = wdx(x, pk.x) < div;
      const snowLine = pk.y + pk.snow + Math.round(3 * wave(x, 17, owner * 2.1) + 2 * wave(x, 41, owner));
      const snowy = y < snowLine;
      let c: string;
      if (snowy) c = lit ? col.snow : col.snowShade;
      else c = lit ? col.lit : col.shade;
      // crisp lit rim along the left-hand silhouette
      if (col.rim && y === top && lit && !snowy) c = col.rim;
      // shaded underside of the snow cap
      if (col.snowDeep && snowy && y === snowLine - 1 && !lit) c = col.snowDeep;
      p.px(x, y, c);
    }
  }
};

const BACK_PEAKS: Peak[] = [
  { x: 30, y: 64, sl: 0.8, sr: 0.9, ridge: 0.2, snow: 8 },
  { x: 118, y: 58, sl: 0.9, sr: 0.75, ridge: -0.1, snow: 10 },
  { x: 205, y: 66, sl: 0.7, sr: 0.85, ridge: 0.15, snow: 7 },
  { x: 268, y: 60, sl: 0.85, sr: 0.8, ridge: 0, snow: 9 },
];

const FAR_PEAKS: Peak[] = [
  { x: 4, y: 58, sl: 1.1, sr: 0.95, ridge: 0.25, snow: 14 },
  { x: 74, y: 46, sl: 1.15, sr: 1.0, ridge: 0.3, snow: 18 },
  { x: 162, y: 54, sl: 1.0, sr: 1.2, ridge: 0.15, snow: 15 },
  { x: 236, y: 50, sl: 1.2, sr: 1.0, ridge: 0.35, snow: 17 },
  { x: 112, y: 70, sl: 0.9, sr: 0.9, ridge: 0.2, snow: 9 },
  { x: 290, y: 68, sl: 1.0, sr: 1.0, ridge: 0.2, snow: 10 },
];

const paintFar = (p: PixelPainter): void => {
  paintRange(p, BACK_PEAKS, BACK, 112);
  paintRange(p, FAR_PEAKS, FAR, 112);
  // cold haze settling at the foot of the range
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(101 + 2 * wave(x, 4, 2.0) + 1.2 * wave(x, 11, 0.6) + 0.6 * wave(x, 27, 1.7));
    p.vline(x, t, 112 - t, FAR.haze);
    p.px(x, t, FAR.hazeLit);
  }
};

// ---------------------------------------------------------------- iron crags
interface Spire {
  x: number;
  y: number;
  sl: number;
  sr: number;
  ridge: number;
}

/**
 * Steep, pointed spire profile: a 2px summit, then a steep flank broken every few pixels by a
 * short ledge (a flat run of 1-2px) so the outline steps like chiselled rock, never rounds off.
 */
const spireTop = (c: Spire, x: number): number => {
  const dx = wdx(x, c.x);
  const a = dx < 0 ? -dx - 1 : dx; // columns -1 and 0 share the summit
  const s = dx < 0 ? c.sl : c.sr;
  const P = dx < 0 ? 5 : 4; // ledge period
  if (a <= 0) return c.y;
  // ledges eat one column of each period after the first two
  const ledges = a > 3 ? Math.floor((a - 3) / P) + 1 : 0;
  return Math.round(c.y + (a - ledges) * s);
};

/** Crag clusters: tall spires at the back, lower ones in front (drawn later). */
const SPIRES: Spire[] = [
  // west crag
  { x: 40, y: 63, sl: 2.2, sr: 2.6, ridge: 0.2 },
  { x: 24, y: 80, sl: 2.0, sr: 2.4, ridge: 0.15 },
  { x: 58, y: 75, sl: 2.4, sr: 2.0, ridge: 0.25 },
  { x: 72, y: 98, sl: 1.8, sr: 2.2, ridge: 0.2 },
  { x: 8, y: 100, sl: 1.6, sr: 2.0, ridge: 0.1 },
  // small knoll
  { x: 128, y: 100, sl: 1.8, sr: 2.0, ridge: 0.2 },
  { x: 140, y: 106, sl: 1.6, sr: 1.8, ridge: 0.2 },
  // east crag
  { x: 206, y: 66, sl: 2.6, sr: 2.2, ridge: 0.2 },
  { x: 190, y: 83, sl: 2.0, sr: 2.6, ridge: 0.15 },
  { x: 224, y: 80, sl: 2.2, sr: 2.0, ridge: 0.25 },
  { x: 240, y: 102, sl: 1.8, sr: 2.0, ridge: 0.2 },
  // far-right stub
  { x: 288, y: 98, sl: 2.0, sr: 1.8, ridge: 0.2 },
  { x: 300, y: 106, sl: 1.8, sr: 2.0, ridge: 0.2 },
];

const paintCrags = (p: PixelPainter): void => {
  const base = 122;
  const owner = (x: number, y: number): number => {
    for (let k = SPIRES.length - 1; k >= 0; k--) if (y >= spireTop(SPIRES[k], x)) return k;
    return -1;
  };
  for (let x = 0; x < TILE_W; x++) {
    for (let y = 50; y < base; y++) {
      const k = owner(x, y);
      if (k < 0) continue;
      const c = SPIRES[k];
      const top = spireTop(c, x);
      const dx = wdx(x, c.x);
      const dy = y - c.y;
      const div = Math.round(c.ridge * dy);
      const lit = dx < div;
      const below = y - top;
      let col = lit ? CRAG.lit : CRAG.shade;
      // mid tone just either side of the ridge line rounds the spire
      if (lit && dx >= div - 2) col = CRAG.mid;
      if (!lit && dx <= div + 1) col = CRAG.mid;
      // vertical striations on the faces
      if (below > 3 && lit && ((dx % 5) + 5) % 5 === 3 && dy % 11 < 7) col = CRAG.mid;
      if (below > 3 && !lit && dx % 4 === 2 && dy % 9 < 6) col = CRAG.deep;
      // silhouette: lit rim on the left, dark edge on the right
      if (below === 0) col = lit ? CRAG.rim : CRAG.deep;
      // a dark seam where a nearer spire overlaps one behind it
      const back = owner(x, y - 1);
      if (below === 0 && back >= 0 && back !== k) col = CRAG.deep;
      // snow cap on the summit with a ragged lower edge, and snow lying on each ledge
      const tongue = (((dx * 5 + k * 3) % 7) + 7) % 7;
      const cap = (c.y < 92 ? 10 : 7) + (tongue < 2 ? 3 : tongue < 4 ? 1 : 0) - (lit ? 0 : 2);
      const flatL = spireTop(c, x - 1) === top, flatR = spireTop(c, x + 1) === top;
      const ledge = (flatL || flatR) && Math.abs(dx) > 1;
      if (dy < cap && back === k) col = lit ? CRAG.snow : CRAG.snowShade;
      else if (dy < cap && below <= 1) col = lit ? CRAG.snow : CRAG.snowShade;
      else if (ledge && below === 0) col = lit ? CRAG.snow : CRAG.snowShade;
      else if (ledge && below === 1) col = lit ? CRAG.snowShade : CRAG.deep;
      p.px(x, y, col);
    }
  }
  // a fog bank pooled at the foot of the crags: a wavy, hard-edged band with a lit crest
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(111 + 1.5 * wave(x, 5, 0.9) + wave(x, 14, 2.3) + 0.6 * wave(x, 31, 0.2));
    p.vline(x, t + 1, base - t - 1, CRAG.mist);
    p.px(x, t, CRAG.fogLit);
  }
};

// ---------------------------------------------------------------- plateau floor

/**
 * An angular stone: a chamfered block with a lit top face (bright edge at upper left), a mid front
 * face and a dark right face; the bottom row sits in its own shadow. `snow` caps the top face.
 */
const stone = (w: number, h: number, snow: boolean): Grid => {
  const cl = Math.max(1, Math.round(Math.min(w, h) * 0.45));
  const cr = Math.max(1, Math.round(Math.min(w, h) * 0.3));
  const topH = Math.max(1, Math.round(h * 0.4));
  const inside = (i: number, j: number): boolean => {
    if (i < 0 || j < 0 || i >= w || j >= h) return false;
    if (i + j < cl) return false;
    if (w - 1 - i + j < cr) return false;
    if (j === h - 1 && (i === 0 || i === w - 1)) return false;
    return true;
  };
  const rows: Grid = [];
  for (let j = 0; j < h; j++) {
    let r = "";
    for (let i = 0; i < w; i++) {
      if (!inside(i, j)) {
        r += ".";
        continue;
      }
      const edge = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1);
      if (edge) {
        r += "o";
        continue;
      }
      // the ridge between faces leans right as it goes down
      const right = i >= Math.round(w * 0.66) + Math.floor(j / 3);
      const topFace = j <= topH;
      let c: string;
      if (topFace) c = right ? "m" : !inside(i, j - 2) && !right ? "h" : "l";
      else c = right ? "d" : "m";
      if (j === h - 2 && !topFace) c = "d";
      if (snow && topFace) c = right ? "t" : "s";
      r += c;
    }
    rows.push(r);
  }
  return rows;
};

/**
 * A wind-packed snow patch lying flat on the rock: stacked horizontal runs with ragged ends, a lit
 * upper edge, a shaded lower edge, a cold contact shadow and a few loose shards trailing downwind.
 */
const snowPatch = (p: PixelPainter, cx: number, cy: number, rx: number, ry: number, seed: number): void => {
  const shadow = GROUND[Math.min(GROUND.length - 1, groundAt(cy) + 2)];
  let minL = 0, maxR = 0;
  for (let j = -ry; j <= ry; j++) {
    const f = Math.sqrt(1 - (j / (ry + 1)) ** 2);
    const half = Math.round(rx * f);
    const jl = ((seed * 7 + (j + 9) * 13) % 5) - 2;
    const jr = ((seed * 11 + (j + 9) * 5) % 5) - 2;
    const l = cx - half + jl, r = cx + half + jr;
    if (j === ry) [minL, maxR] = [l, r];
    for (let x = l; x <= r; x++) {
      let c = SNOW.mid;
      if (j === -ry) c = x < l + (r - l) * 0.7 ? SNOW.hi : SNOW.mid;
      else if (j === -ry + 1 && ry >= 2 && x < l + (r - l) * 0.4) c = SNOW.hi;
      if (j === ry && ry >= 1) c = SNOW.lo;
      if (x === r && j > -ry) c = SNOW.lo;
      p.px(x, cy + j, c);
    }
  }
  p.hline(minL + 1, cy + ry + 1, maxR - minL - 1, shadow);
  // loose shards trailing to the right
  for (let k = 0; k < ry - 1; k++) {
    const x = maxR + 3 + k * 4 + (seed % 3);
    const y = cy + ry - (k % 2) - 1;
    const len = Math.max(1, 3 - k);
    p.hline(x, y, len, SNOW.mid);
    p.hline(x, y + 1, len, shadow);
  }
};

const crack = (p: PixelPainter, x: number, y: number, len: number, seg: number): void => {
  let cx = x, cy = y;
  let d = 1;
  let run = 0;
  for (let k = 0; k < len; k++) {
    p.px(cx, cy, GR.crack);
    p.px(cx, cy + 1, GR.crackLit);
    cx++;
    run++;
    if (run >= seg + ((k * 7) % 3)) {
      run = 0;
      cy += d;
      d = ((k * 13 + x) % 5) < 2 ? -d : d;
      p.px(cx - 1, cy, GR.crack);
    }
  }
};

const plant = (p: PixelPainter, g: Grid, cx: number, by: number, pal: Palette): void => {
  p.stamp(g, Math.round(cx - g[0].length / 2), by - g.length + 1, pal);
};

const paintGround = (p: PixelPainter): void => {
  strata(p, GSTOP.map((y, i) => [y, GROUND[i]] as [number, string]), p.h, 3);
  // the plateau's far rim: an uneven lit lip against the crags
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(GSTOP[0] - 1 - 1.2 * wave(x, 7, 0.4) - 0.8 * wave(x, 19, 2.2));
    p.vline(x, e, GSTOP[0] - e, GROUND[0]);
    p.px(x, e, GR.lip);
  }

  // slab seams: long horizontal joints that step down a pixel now and then; faint and short far
  // off, longer and bolder near the front, each with a lit lip on the slab below
  p.reseed(733);
  for (let y = 118; y < p.h - 2; y += 6 + Math.floor((y - 112) / 5)) {
    const depth = (y - 112) / 68;
    const n = 2 + Math.round(depth * 2);
    for (let k = 0; k < n; k++) {
      const x = Math.floor(p.rand() * TILE_W);
      const len = 10 + Math.round(depth * 40 + p.rand() * 16);
      const gi = groundAt(y);
      const dark = depth > 0.45 ? GR.seam : GROUND[Math.min(GROUND.length - 1, gi + 2)];
      const lip = GROUND[Math.max(0, gi - 1)];
      const stepAt = 4 + Math.floor(p.rand() * (len - 8));
      for (let i = 0; i < len; i++) {
        const yy = y + (i >= stepAt ? 1 : 0);
        p.px(x + i, yy, dark);
        if (i > 0 && i < len - 1) p.px(x + i, yy + 1, lip);
      }
    }
  }

  // cracks
  const CRACKS: [number, number, number, number][] = [
    [14, 126, 18, 4], [120, 121, 12, 3], [200, 129, 22, 5], [270, 124, 14, 4],
    [60, 150, 30, 6], [168, 156, 36, 7], [248, 164, 40, 8], [6, 170, 30, 7], [100, 172, 34, 8],
  ];
  for (const [x, y, len, seg] of CRACKS) crack(p, x, y, len, seg);

  // grit: tiny two-tone chips, scattered on a loose grid so they never clump into noise
  p.reseed(4049);
  for (let gy = 128; gy < p.h; gy += 7 + Math.floor((gy - 112) / 10)) {
    for (let gx = 0; gx < TILE_W; gx += 41) {
      const x = gx + Math.floor(p.rand() * 18);
      const y = gy + Math.floor(p.rand() * 3);
      const gi = groundAt(y);
      p.px(x, y, GROUND[Math.max(0, gi - 2)]);
      p.px(x + 1, y, GROUND[Math.min(GROUND.length - 1, gi + 2)]);
      if (y > 150) p.px(x, y + 1, GROUND[Math.min(GROUND.length - 1, gi + 2)]);
    }
  }

  // snow patches, bigger near the front; few right at the fighters' feet
  const PATCHES: [number, number, number, number][] = [
    [40, 118, 8, 1], [134, 116, 6, 1], [224, 119, 10, 1], [300, 117, 5, 1],
    [90, 126, 11, 2], [258, 128, 9, 2],
    [12, 158, 16, 2], [140, 165, 20, 3], [222, 155, 13, 2], [300, 171, 18, 3], [70, 176, 14, 2],
  ];
  PATCHES.forEach(([x, y, rx, ry], i) => {
    snowPatch(p, x, y, rx, ry, i * 1.9);
  });

  // stones: pebbles far, rocks near; each with a short shadow to the lower right
  const STONES: [number, number, number, number, number][] = [
    // x, bottom y, w, h, snow?
    [22, 119, 3, 2, 0], [66, 117, 3, 2, 0], [108, 121, 4, 3, 0], [176, 118, 3, 2, 0], [248, 122, 4, 3, 0], [286, 120, 3, 2, 0],
    [50, 132, 6, 4, 0], [55, 133, 3, 2, 0],
    // two mid-distance rubble clusters
    [18, 129, 6, 4, 0], [25, 130, 9, 6, 1], [33, 131, 4, 3, 0], [30, 132, 3, 2, 0],
    [250, 127, 7, 5, 0], [258, 128, 10, 6, 1], [266, 129, 4, 3, 0], [152, 135, 7, 5, 1], [214, 132, 5, 4, 0], [312, 136, 6, 4, 0],
    [8, 145, 8, 6, 0], [116, 147, 6, 4, 0], [122, 148, 4, 3, 0], [278, 149, 10, 7, 1],
    [44, 164, 14, 9, 1], [96, 159, 8, 6, 0], [192, 170, 16, 10, 0], [203, 172, 7, 5, 0], [262, 177, 12, 8, 1], [158, 178, 7, 5, 0],
  ];
  for (const [x, by, w, h, s] of STONES) {
    const gi = groundAt(by);
    const shadow = GROUND[Math.min(GROUND.length - 1, gi + 2)];
    p.hline(x - Math.floor(w / 2) + 1, by + 1, w + Math.floor(w / 3), shadow);
    plant(p, w <= 3 ? ["hl.", "lmd", ".do"] : stone(w, h, s === 1), x, by, STONE);
  }

};

// ---------------------------------------------------------------- foreground
const FRONT_PAL: Palette = { o: "#0e0b16", d: "#1c1828", m: "#262236", l: "#332f48", h: "#46425e", s: "#5c5a7c", t: "#44425e" };

const paintFront = (p: PixelPainter): void => {
  // a low ridge of dark rubble along the very bottom
  for (let x = 0; x < TILE_W; x++) {
    const h = Math.round(2.5 + 1.5 * wave(x, 6, 0.4) + wave(x, 17, 1.1));
    if (h > 0) {
      p.vline(x, p.h - h, h, FRONT_PAL.m);
      p.px(x, p.h - h, FRONT_PAL.o);
    }
  }
  // two big boulders in the corners of the near view, half sunk below the frame
  plant(p, stone(34, 15, true), 14, p.h + 5, FRONT_PAL);
  plant(p, stone(14, 9, false), 40, p.h + 2, FRONT_PAL);
  plant(p, stone(22, 11, true), 196, p.h + 4, FRONT_PAL);
};

// ---------------------------------------------------------------- field
const field: Battlefield = {
  terrain: "mountain",
  ambient: "snow",
  ambientColors: ["#ffffff", "#e6e8ff", "#c4c8f0"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.08, drift: 1.5, paint: paintCirrus },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.5, paint: paintCrags },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};


export default field;
