import type { Palette } from "../../palette";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";

/**
 * Shared pieces of the Volcanic world's duel battlefields: a red-smoke sky that glows hot at the
 * horizon, smoke banks lit from below, a far range of volcanoes with glowing craters and lava
 * runs, plus the strata / crack / ember helpers the five terrains reuse with their own palettes.
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

/** Index of the stratum that holds row y. */
export const bandIndex = (stops: [number, string][], y: number): number => {
  let i = 0;
  while (i + 1 < stops.length && y >= stops[i + 1][0]) i++;
  return i;
};

/** Stamps a grid by its bottom-centre anchor. */
export const plant = (p: PixelPainter, g: Grid, cx: number, by: number, pal: Palette): void => {
  p.stamp(g, Math.round(cx - g[0].length / 2), by - g.length + 1, pal);
};

/** Lava colours shared by every terrain (the board's EMBER / LAVA / pool highlight). */
export const LAVA = { white: "#fff0b0", hot: "#ffd070", glow: "#ffa040", lava: "#ff6a1a", ember: "#ff7a2a", deep: "#c83a10", crust: "#7a1e0a" };

export const EMBER_COLORS = ["#ff7a2a", "#ffd070", "#ff5a20", "#ffa040"];
export const ASH_COLORS = ["#8a8482", "#6a6462", "#b0a8a4", "#ff7a2a"];

// ---------------------------------------------------------------- sky

/** Black smoke overhead, through blood red, to the hot orange horizon of the board's sky. */
export const SKY = [
  "#080304", "#0e0405", "#160607", "#1f0808", "#2a0a08", "#370d0a", "#45100c",
  "#53130e", "#621710", "#761e13", "#8c2716", "#a0301a", "#b63c1f", "#ca4a26", "#e06030",
];

/** Fills the sky down to `bottom`, adds a few dim sparks high up and a low dithered glow at `gx`. */
export const paintSky = (p: PixelPainter, bottom: number, gx: number, seed: number): void => {
  const step = bottom / SKY.length;
  strata(
    p,
    SKY.map((c, i) => [Math.round(i * step), c] as [number, string]),
    p.h,
    3,
  );
  // the glow of a lava sea far beyond the horizon: an ordered-dither gradient in a flat ellipse
  const GLOW = ["#a0301a", "#ca4a26", "#e06030", "#f07a3c", "#ff9a50"];
  const R = 90;
  for (let y = bottom - 46; y < bottom; y++)
    for (let dx = -R; dx <= R; dx++) {
      const d = Math.sqrt((dx / R) ** 2 + ((bottom - y) / 46) ** 2);
      if (d >= 1) continue;
      const f = (1 - d) * GLOW.length - 0.6;
      if (f < 0) continue;
      const i = Math.floor(f);
      const x = gx + dx;
      if (i > 0) p.px(x, y, GLOW[Math.min(GLOW.length - 1, i - 1)]);
      if (i < GLOW.length) p.dither(x, y, 1, 1, GLOW[i], Math.round((f - i) * 16));
    }
  // ember sparks drifting high in the smoke
  p.reseed(seed);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 22 + Math.floor(p.rand() * p.rand() * bottom * 0.45);
    const k = p.rand();
    if (k > 0.9) {
      p.px(x, y, "#ffd0a0");
      p.px(x + 1, y, "#a04020");
      p.px(x, y + 1, "#a04020");
    } else p.px(x, y, k > 0.5 ? "#c06040" : "#7a2a1c");
  }
};

// ---------------------------------------------------------------- smoke

export interface SmokePal {
  top: string;
  body: string;
  lit: string;
  rim: string;
}
export const SMOKE: SmokePal = { top: "#1c0807", body: "#2c0d0a", lit: "#4e1810", rim: "#7a2a16" };

/**
 * A long smoke bank: a lumpy dark top that tapers at both ends and a flat underside lit orange by
 * the fire below. `len` px wide, `thick` px at its fattest.
 */
export const smokeBank = (p: PixelPainter, x0: number, y: number, len: number, thick: number, pal: SmokePal, seed: number): void => {
  for (let i = 0; i < len; i++) {
    const u = i / (len - 1);
    const taper = Math.sin(Math.PI * u);
    // rounded billows along the top rather than a flat streak
    const lump = 0.55 + 0.45 * Math.abs(Math.sin(i * 0.16 + seed)) + 0.12 * Math.sin(i * 0.5 + seed * 2);
    const h = Math.round(thick * 1.35 * Math.pow(taper, 0.6) * lump);
    if (h <= 0) continue;
    const under = Math.round(1.2 * Math.sin(i * 0.21 + seed));
    const bot = y + under;
    const top = bot - h;
    p.vline(x0 + i, top, h, pal.body);
    p.px(x0 + i, top, pal.top);
    if (h > 2) p.px(x0 + i, top + 1, pal.top);
    p.px(x0 + i, bot - 1, pal.lit);
    if (h > 3) p.px(x0 + i, bot - 2, ((i + bot) & 1) === 0 ? pal.lit : pal.body);
    if (h > 1) p.px(x0 + i, bot, pal.rim);
  }
};

/** A default set of banks for the drifting smoke layer. */
export const paintSmoke = (p: PixelPainter, banks: [number, number, number, number][], pal: SmokePal = SMOKE): void => {
  banks.forEach(([x, y, len, thick], i) => smokeBank(p, x, y, len, thick, pal, i * 1.7 + 0.4));
};

// ---------------------------------------------------------------- far volcano range

export interface RangePal {
  rim: string;
  body: string;
  shade: string;
}

/** Distant ridge colours: back very close to the horizon glow, front darker. */
export const RANGE_BACK: RangePal = { rim: "#a83a20", body: "#8a2a18", shade: "#7a2416" };
export const RANGE_FAR: RangePal = { rim: "#6a2216", body: "#4a160e", shade: "#3a110b" };

export interface Volcano {
  x: number;
  /** Crater rim row. */
  y: number;
  /** Half-width of the crater. */
  crater: number;
  /** Flank slope (px down per px across). */
  slope: number;
}

/** The height of a volcano's cone at column x (Infinity when x is off the cone). */
export const coneTop = (v: Volcano, x: number, base: number): number => {
  const a = Math.abs(wdx(x, v.x));
  if (a <= v.crater) return v.y + (a < v.crater - 1 ? 1 : 0);
  const t = v.y + (a - v.crater) * v.slope * (1 - Math.min(0.5, (a - v.crater) / 160));
  return t >= base ? Infinity : Math.round(t + 0.8 * wave(x, 23, v.x));
};

/**
 * A range of ridges with volcano cones rising out of it. Each cone has a glowing crater, a lava
 * run winding down one flank and a lit left face.
 */
export const paintVolcanoes = (
  p: PixelPainter,
  ridge: (x: number) => number,
  cones: Volcano[],
  pal: RangePal,
  base: number,
  lava: boolean,
): void => {
  for (let x = 0; x < TILE_W; x++) {
    let t = ridge(x);
    let owner: Volcano | null = null;
    for (const v of cones) {
      const c = coneTop(v, x, base);
      if (c < t) {
        t = c;
        owner = v;
      }
    }
    t = Math.round(t);
    p.vline(x, t, base - t, pal.body);
    const slope = ridge(x + 1) - ridge(x - 1);
    if (owner) {
      const dx = wdx(x, owner.x);
      // the shaded right flank of the cone
      if (dx > 1) p.vline(x, t + 1, base - t - 1, pal.shade);
      if (dx < 0) p.px(x, t, pal.rim);
    } else if (slope > 0) p.px(x, t, pal.rim);
  }
  if (!lava) return;
  for (const v of cones) {
    // crater glow and a plume base
    for (let i = -v.crater + 1; i < v.crater; i++) {
      p.px(v.x + i, v.y, Math.abs(i) < v.crater - 2 ? LAVA.hot : LAVA.lava);
      p.px(v.x + i, v.y + 1, LAVA.lava);
    }
    p.dither(v.x - v.crater, v.y - 2, v.crater * 2 + 1, 2, LAVA.deep, 6);
    // a lava run winding down the left flank: it follows the slope at about half the flank's
    // spread, swings from side to side, is 2px wide near the crater and splits near the foot
    const flank = (y: number): number => (y - v.y) / v.slope;
    for (let y = v.y + 2; y < base - 1; y++) {
      const d = y - v.y;
      const lx = Math.round(v.x - v.crater * 0.5 - flank(y) * 0.45 + 1.6 * Math.sin(d * 0.45 + v.x));
      if (y < coneTop(v, lx, base)) continue;
      p.px(lx, y, d < 6 ? LAVA.glow : LAVA.lava);
      if (d < 10) p.px(lx + 1, y, LAVA.deep);
      if (d > 6 && d % 5 === 2) p.px(lx - 1, y, LAVA.deep);
      // a side branch peeling off to the left below mid-slope
      const bd = d - Math.round((base - v.y) * 0.55);
      if (bd > 0 && bd < 12) {
        const bx = lx - 2 - Math.round(bd * 0.6);
        if (y >= coneTop(v, bx, base)) p.px(bx, y, bd < 6 ? LAVA.lava : LAVA.deep);
      }
    }
  }
};

/**
 * A rising ash plume over a crater: a column of round puffs that widens and leans as it rises,
 * lit orange from the crater below and dark on top.
 */
export const plume = (p: PixelPainter, x: number, y: number, h: number, pal: SmokePal): void => {
  const puffs: [number, number, number][] = [];
  for (let k = 0; k < h; k += 3) {
    const r = Math.round(1.5 + k * 0.16);
    puffs.push([x + Math.round(k * k * 0.03) + (k % 6 === 0 ? -1 : 1), y - k - r + 1, r]);
  }
  // each puff is a flat ellipse; it leans and spreads downwind as it rises. Top-most first so the
  // lower puffs overlap the ones above, each with a lit underside where the crater glow reaches
  for (let i = puffs.length - 1; i >= 0; i--) {
    const [cx, cy, r] = puffs[i];
    const rx = Math.round(r * (1.3 + i * 0.12));
    p.ellipse(cx, cy, rx, r, pal.body);
    p.hline(cx - rx + 1, cy - r, Math.max(1, rx - 1), pal.top);
    if (i < puffs.length * 0.5) p.hline(cx - rx + 2, cy + r, Math.max(1, rx * 2 - 3), i < 2 ? pal.rim : pal.lit);
  }
};

// ---------------------------------------------------------------- ground details

/** A glowing fissure: a dark crack with a hot core that wanders sideways. */
export const fissure = (p: PixelPainter, x: number, y: number, len: number, seg: number, dark: string, hot: string, core?: string): void => {
  let cx = x, cy = y, d = 1, run = 0;
  for (let k = 0; k < len; k++) {
    p.px(cx, cy - 1, dark);
    p.px(cx, cy, hot);
    if (core && k > 2 && k < len - 3 && k % 5 < 3) p.px(cx, cy, core);
    p.px(cx, cy + 1, dark);
    cx++;
    run++;
    if (run >= seg + ((k * 7) % 3)) {
      run = 0;
      cy += d;
      p.px(cx - 1, cy, hot);
      d = (k * 13 + x) % 5 < 2 ? -d : d;
    }
  }
};

/**
 * A pool of molten lava lying flat: a crust rim, a bright interior with hot streaks, a dark
 * cooled skin on the far side and a ring of heated ground (`glow`) around it.
 */
export const lavaPool = (p: PixelPainter, cx: number, cy: number, rx: number, ry: number, glow: string, rim: string): void => {
  for (let j = -ry - 1; j <= ry + 1; j++) {
    const f = 1 - (j / (ry + 1.5)) ** 2;
    if (f <= 0) continue;
    const half = Math.round((rx + 2) * Math.sqrt(f));
    p.hline(cx - half, cy + j, half * 2 + 1, glow);
  }
  for (let j = -ry; j <= ry; j++) {
    const f = 1 - (j / (ry + 0.5)) ** 2;
    const half = Math.round(rx * Math.sqrt(Math.max(0, f)));
    for (let i = -half; i <= half; i++) {
      const edge = Math.abs(i) >= half - 1 || j === -ry || j === ry;
      let c = LAVA.lava;
      if (edge) c = rim;
      else if (j === -ry + 1) c = LAVA.deep;
      else if ((i + j * 3 + 40) % 9 < 3 && j > -ry + 1) c = LAVA.glow;
      if (!edge && j === 0 && Math.abs(i) < half * 0.5) c = LAVA.hot;
      p.px(cx + i, cy + j, c);
    }
  }
};

/** Small loose embers glowing in cracks of the ground: a hot pixel with a dim neighbour. */
export const embers = (p: PixelPainter, seed: number, n: number, y0: number, y1: number, ok: (x: number, y: number) => boolean): void => {
  p.reseed(seed);
  for (let k = 0; k < n; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = y0 + Math.floor(p.rand() * (y1 - y0));
    if (!ok(x, y)) continue;
    p.px(x, y, p.rand() > 0.6 ? LAVA.hot : LAVA.ember);
    p.px(x + 1, y, LAVA.deep);
  }
};

// ---------------------------------------------------------------- perspective cells

export interface CellPx {
  /** Id of the owning cell. */
  id: number;
  /** Id of the nearest other cell (the one across the closest joint). */
  other: number;
  /** True on the 1px joint between two cells. */
  seam: boolean;
}

/**
 * Voronoi cells laid flat on the ground in perspective: rows grow taller towards the bottom of the
 * screen and every row holds a whole number of cells, so the pattern wraps at TILE_W. `aspect` is
 * cell width over row height; `rowScale` sets how many rows fit between y0 and the bottom.
 */
export const groundCells = (y0: number, h: number, seed: number, aspect: number, rowScale: number): CellPx[][] => {
  const K = 12;
  const s = (y: number): number => rowScale * Math.log((y - y0 + K) / K);
  const rowH = (y: number): number => (y - y0 + K) / rowScale;
  const rows = Math.ceil(s(h)) + 2;
  let st = seed;
  const rnd = (): number => {
    st = (st * 16807) % 2147483647;
    return (st - 1) / 2147483646;
  };
  const seeds: { x: number; s: number; id: number }[][] = [];
  let id = 0;
  for (let j = -1; j < rows; j++) {
    const yMid = y0 - K + K * Math.exp((j + 0.5) / rowScale);
    const n = Math.max(4, Math.round(TILE_W / (aspect * rowH(yMid))));
    const row: { x: number; s: number; id: number }[] = [];
    for (let k = 0; k < n; k++) row.push({ x: ((k + 0.2 + rnd() * 0.6) * TILE_W) / n, s: j + 0.25 + rnd() * 0.5, id: id++ });
    seeds.push(row);
  }
  const out: CellPx[][] = [];
  for (let y = y0; y < h; y++) {
    const sy = s(y);
    const w = aspect * rowH(y);
    const j = Math.floor(sy);
    const line: CellPx[] = [];
    for (let x = 0; x < TILE_W; x++) {
      let d1 = Infinity, d2 = Infinity, i1 = -1, i2 = -1;
      for (let jj = j - 1; jj <= j + 1; jj++) {
        const row = seeds[jj + 1];
        if (!row) continue;
        for (const sd of row) {
          const dx = wdx(x, sd.x) / w;
          if (Math.abs(dx) > 2.5) continue;
          const d = Math.sqrt(dx * dx + (sy - sd.s) ** 2);
          if (d < d1) {
            d2 = d1;
            i2 = i1;
            d1 = d;
            i1 = sd.id;
          } else if (d < d2) {
            d2 = d;
            i2 = sd.id;
          }
        }
      }
      line.push({ id: i1, other: i2, seam: d2 - d1 < 1.1 / rowH(y) });
    }
    out.push(line);
  }
  return out;
};

/** A stable small hash of a cell id (or a pair of ids) for per-cell variation. */
export const hash = (a: number, b = 0): number => {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  return Math.abs(((lo * 73856093) ^ (hi * 19349663)) % 1009);
};
