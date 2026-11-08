import type { Battlefield } from "../field";
import { FLOOR_Y, TILE_W, wave, type PixelPainter } from "../painter";
import type { Grid } from "../sheet";
import type { Palette } from "../palette";

/**
 * "The Sunken Realm": a murky swamp at dusk. A sickly pale moon behind streaks of haze, a hazy
 * line of drowned trees far off, twisted dead trees hung with moss standing in still water,
 * low dithered fog, and a muddy bank between two dark pools where the fighters stand.
 */

// ---------------------------------------------------------------- palettes
const SKY = ["#1c1828", "#242036", "#2d2a44", "#38374e", "#454656", "#53585c", "#626a62", "#727c68"];
const MOON = { core: "#e4e6b8", lit: "#f2f2d0", shade: "#c6ca98", crater: "#cbcd9e", veil: "#a8ac88", halo1: "#4e5260", halo2: "#62685e" };
const HAZE = { dark: "#34324a", mid: "#363648", lit: "#5c6260", glow: "#8a8e78" };
const FAR = { back: "#6a7466", tree: "#5c665c", tree2: "#646e62", fog: "#86907c" };
const WATER = { top: "#56625a", base: "#46524c", deep: "#3a4642", streak: "#66726a", glint: "#a8ae88", glint2: "#868c74", refl: "#2e3834" };
const MIDTREE: Palette = { o: "#1c201e", d: "#2a302c", b: "#363e38", l: "#4a5248", g: "#465434", G: "#5a6840", h: "#36422a" };
/** The standing dead trees sit behind haze: lifted, cooler and lower contrast than the bank. */
const HAZETREE: Palette = { o: "#2a2c36", d: "#343840", b: "#3e4448", l: "#515852", g: "#48523e", G: "#58624a", h: "#3e4636" };
const FOG = "#7e8878";
const FOG_THIN = "#6c7668";
const MUD = { lip: "#7a7050", edge: "#2a2a22", m0: "#5a5038", m1: "#524834", m2: "#4a4130", m3: "#423a2c", m4: "#3a3328", dark: "#2e2920", wet: "#6a6048" };
const POOL = { top: "#3e4a46", base: "#2e3836", deep: "#242c2c", streak: "#4e5c56", glint: "#7c866e", rim: "#1c2220" };
const MOSS = { d: "#3e4a26", b: "#4e5c2e", l: "#62723a", h: "#7a8a46" };
const REED: Palette = { d: "#36421f", b: "#4c5a2a", l: "#68783a", h: "#84944a", c: "#4a3020", C: "#6e4a2c", k: "#8a6440", s: "#2c3418" };
const LILY: Palette = { d: "#2e4224", b: "#44602e", l: "#5e7e3a", f: "#d8c8cc", F: "#b49aa6", y: "#d8c870" };
const FRONT = { a: "#121614", b: "#1a201c", c: "#232a24" };

// ---------------------------------------------------------------- helpers
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const bay = (x: number, y: number): number => BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4];

/** One dithered pixel: drawn when the Bayer threshold at (x, y) is below `level` (0..16). */
const dpx = (p: PixelPainter, x: number, y: number, c: string, level: number): void => {
  if (bay(x, y) < level) p.px(x, y, c);
};

const ditherDisc = (p: PixelPainter, cx: number, cy: number, r: number, c: string, level: number): void => {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) dpx(p, cx + x, cy + y, c, level);
};

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

const lcg = (seed: number): (() => number) => {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

/** Stamps a grid by its bottom-centre anchor. */
const plant = (p: PixelPainter, g: Grid, cx: number, by: number, pal: Palette): void => {
  p.stamp(g, Math.round(cx - g[0].length / 2), by - g.length + 1, pal);
};

// ---------------------------------------------------------------- dead trees
interface TreeSpec {
  seed: number;
  /** Trunk height in px. */
  trunk: number;
  /** Trunk radius at the base. */
  r: number;
  /** Horizontal lean of the trunk top in px. */
  lean: number;
  /** Length of the main limbs. */
  limb: number;
  /** Chance of moss on a limb point (0..1). */
  moss: number;
  /** Longest moss strand. */
  mossLen: number;
}

interface Tree {
  grid: Grid;
  /** Column of the trunk base inside the grid. */
  base: number;
}

/**
 * Grows a gnarled dead tree as a grid: o outline, l/b/d wood lit from the top left, g/G/h moss
 * curtains hanging from the limbs. Built on a mask from rounded disc stamps along crooked limbs,
 * so thin twigs come out as clean 1px lines.
 */
const growTree = (s: TreeSpec): Tree => {
  const W = 120;
  const H = s.trunk + s.limb + 40;
  const R = lcg(s.seed);
  const mask: boolean[][] = Array.from({ length: H }, () => new Array<boolean>(W).fill(false));
  const at = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < W && y < H && mask[y][x];
  const blot = (fx: number, fy: number, r: number): void => {
    const cx = Math.round(fx), cy = Math.round(fy);
    const n = Math.ceil(r);
    for (let dy = -n; dy <= n; dy++)
      for (let dx = -n; dx <= n; dx++)
        if (dx * dx + dy * dy <= r * r + r * 0.5) {
          const x = cx + dx, y = cy + dy;
          if (x >= 0 && y >= 0 && x < W && y < H) mask[y][x] = true;
        }
  };
  const hangs: [number, number][] = [];
  const seg = (x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, moss: boolean): void => {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      blot(x, y, r0 + (r1 - r0) * t);
      if (moss && i % 2 === 0) hangs.push([Math.round(x), Math.round(y)]);
    }
  };
  const limb = (x: number, y: number, a: number, len: number, r: number, depth: number): void => {
    let cx = x, cy = y;
    const parts = 3;
    for (let i = 0; i < parts; i++) {
      a += (R() - 0.5) * 0.7;
      // dead limbs sag a little as they reach out
      if (Math.abs(Math.cos(a)) > 0.6) a += Math.sign(Math.cos(a)) * 0.08;
      const nx = cx + (Math.cos(a) * len) / parts, ny = cy + (Math.sin(a) * len) / parts;
      seg(cx, cy, nx, ny, r * (1 - (i / parts) * 0.45), r * (1 - ((i + 1) / parts) * 0.45), true);
      cx = nx;
      cy = ny;
    }
    if (depth > 0) {
      limb(cx, cy, a - 0.35 - R() * 0.5, len * 0.62, r * 0.55, depth - 1);
      limb(cx, cy, a + 0.35 + R() * 0.5, len * 0.62, r * 0.55, depth - 1);
    } else {
      const ta = a + (R() - 0.5) * 1.2;
      seg(cx, cy, cx + Math.cos(ta) * 3, cy + Math.sin(ta) * 3, 0.3, 0.3, false);
    }
  };

  const bx = W / 2, by = H - 1;
  const tx = bx + s.lean, ty = by - s.trunk;
  // flared roots
  for (const side of [-1, 1]) {
    seg(bx + side * s.r * 0.5, by - s.r * 1.6, bx + side * (s.r + 4), by, s.r * 0.45, 0.5, false);
    seg(bx + side * s.r * 0.5, by - s.r * 2.6, bx + side * (s.r + 7), by - 0.4, s.r * 0.3, 0.3, false);
  }
  // trunk, with a slight S-bend
  const mid = { x: bx - s.lean * 0.3, y: by - s.trunk * 0.5 };
  seg(bx, by, mid.x, mid.y, s.r, s.r * 0.8, false);
  seg(mid.x, mid.y, tx, ty, s.r * 0.8, s.r * 0.6, false);
  // a crooked side limb low on the trunk
  const side = R() < 0.5 ? -1 : 1;
  const sy = by - s.trunk * (0.55 + R() * 0.15);
  const sx = bx + (mid.x - bx) * 0.9;
  limb(sx, sy, -Math.PI / 2 + side * (1.05 + R() * 0.3), s.limb * 0.7, s.r * 0.45, 1);
  // crown limbs
  limb(tx, ty, -Math.PI / 2 - 0.55 - R() * 0.3, s.limb, s.r * 0.6, 2);
  limb(tx, ty, -Math.PI / 2 + 0.55 + R() * 0.3, s.limb * 0.9, s.r * 0.55, 2);
  if (R() < 0.6) limb(tx, ty, -Math.PI / 2 + (R() - 0.5) * 0.4, s.limb * 0.6, s.r * 0.4, 1);

  // shade the wood
  const out: string[][] = Array.from({ length: H }, () => new Array<string>(W).fill("."));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (at(x, y)) {
        const L = !at(x - 1, y), Rt = !at(x + 1, y), U = !at(x, y - 1);
        if (L && Rt) out[y][x] = U ? "l" : "b";
        else if (Rt) out[y][x] = "d";
        else if (L || U) out[y][x] = "l";
        else if (!at(x + 2, y) && at(x - 2, y)) out[y][x] = "d";
        else out[y][x] = "b";
      } else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) out[y][x] = "o";
    }
  // bark: a few darker vertical cracks on the wide part of the trunk
  for (let y = by - Math.round(s.trunk * 0.75); y < by - 2; y++)
    for (let x = 0; x < W; x++)
      if (out[y][x] === "b" && at(x - 2, y) && at(x + 2, y) && (x * 7 + Math.floor(y / 5) * 3) % 5 === 0) out[y][x] = "d";

  // moss curtains under the limbs
  for (const [hx, hy] of hangs) {
    if (R() > s.moss) continue;
    let y = hy;
    while (at(hx, y)) y++;
    const n = 1 + Math.floor(R() * 3);
    const base = 3 + Math.floor(R() * s.mossLen);
    for (let i = 0; i < n; i++) {
      const x = hx + i - Math.floor(n / 2);
      const len = Math.max(2, Math.round(base * (1 - Math.abs(i - (n - 1) / 2) * 0.35)));
      // start under this column's own underside
      let y0 = y;
      if (x !== hx) {
        y0 = hy;
        while (at(x, y0)) y0++;
        if (y0 - hy > 3) continue;
      }
      for (let j = 0; j < len; j++) {
        const yy = y0 + j;
        if (yy >= H || at(x, yy)) break;
        out[yy][x] = j >= len - 1 && len > 3 ? "h" : i === 0 && j < len * 0.6 ? "G" : "g";
      }
    }
  }

  // crop to the bounding box
  let x0 = W, x1 = -1, y0 = H;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (out[y][x] !== ".") {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
      }
  const grid = out.slice(y0).map((row) => row.slice(x0, x1 + 1).join(""));
  return { grid, base: Math.round(bx) - x0 };
};

const plantTree = (p: PixelPainter, t: Tree, x: number, groundY: number, pal: Palette): void => {
  p.stamp(t.grid, x - t.base, groundY - t.grid.length + 1, pal);
};

// ---------------------------------------------------------------- sky
const MOON_X = 232, MOON_Y = 40;

/** Maria: soft, irregular darker seas rather than tiny crater dots (dots read as a crosshair at 1x). */
const CRATERS: Grid = [
  "..ccc.......",
  ".ccccc..c...",
  ".cccccccc...",
  "..ccc..cc...",
  "............",
  "......c.....",
  ".....ccc....",
  "....cccc....",
  ".....cc.....",
];

/** A thin streak of haze: tapered ends stepping 1-2-3, a lit top edge where the moon is behind it. */
const streak = (p: PixelPainter, x: number, y: number, len: number, rows: number, c: string, lit?: string): void => {
  for (let j = 0; j < rows; j++) {
    const inset = j === 0 ? 6 : j === rows - 1 ? 4 : 0;
    const skew = j * 3;
    for (let i = inset; i < len - inset; i++) {
      const xx = x + i + skew, yy = y + j;
      const md = (xx - MOON_X) ** 2 + (yy - MOON_Y) ** 2;
      p.px(xx, yy, lit && md <= 125 ? (md <= 81 ? MOON.veil : HAZE.glow) : c);
    }
    if (lit && j === 0) {
      for (let i = inset; i < len - inset; i++) {
        const xx = x + i + skew;
        const d = Math.abs(xx - MOON_X);
        if (d < 16) p.px(xx, y - 1, lit);
      }
    }
  }
};

const paintSky = (p: PixelPainter): void => {
  strata(
    p,
    [
      [0, SKY[0]],
      [16, SKY[1]],
      [30, SKY[2]],
      [44, SKY[3]],
      [56, SKY[4]],
      [68, SKY[5]],
      [80, SKY[6]],
      [90, SKY[7]],
    ],
    120,
    4,
  );
  // sickly halo: a checker ring and a solid inner glow
  ditherDisc(p, MOON_X, MOON_Y, 19, MOON.halo1, 8);
  p.disc(MOON_X, MOON_Y, 15, MOON.halo1);
  ditherDisc(p, MOON_X, MOON_Y, 15, MOON.halo2, 8);
  p.disc(MOON_X, MOON_Y, 13, MOON.halo2);
  // the moon: lit rim top-left, shaded crescent bottom-right, a few craters
  const MR = 11;
  p.disc(MOON_X, MOON_Y, MR, MOON.core);
  for (let y = -MR; y <= MR; y++)
    for (let x = -MR; x <= MR; x++) {
      const d = x * x + y * y;
      if (d > MR * MR + MR * 0.35) continue;
      if (d > (MR - 2) * (MR - 2) && x + y > 3) p.px(MOON_X + x, MOON_Y + y, MOON.shade);
      else if (d > (MR - 2) * (MR - 2) && x + y < -6) p.px(MOON_X + x, MOON_Y + y, MOON.lit);
    }
  p.stamp(CRATERS, MOON_X - 6, MOON_Y - 6, { c: MOON.crater });
  // haze streaks drifting across the moon and the dusk
  streak(p, MOON_X - 44, MOON_Y + 5, 64, 2, HAZE.mid, HAZE.lit);
  streak(p, 40, 26, 70, 3, HAZE.dark);
  streak(p, 80, 34, 40, 2, HAZE.dark);
  streak(p, 150, 58, 60, 2, HAZE.mid);
  streak(p, 10, 62, 50, 3, HAZE.mid);
  streak(p, 284, 70, 54, 2, SKY[4]);
  streak(p, 120, 76, 70, 3, SKY[4]);
  streak(p, 200, 84, 50, 2, SKY[5]);
};

// ---------------------------------------------------------------- far drowned forest
const farTop = (x: number): number => 99 - 2 * wave(x, 3, 0.7) - 1.5 * wave(x, 7, 2.1) - 1.5 * Math.abs(wave(x, 23, 0.4));

const FAR_TREES: Tree[] = [
  growTree({ seed: 11, trunk: 12, r: 1.2, lean: 2, limb: 9, moss: 0.25, mossLen: 4 }),
  growTree({ seed: 23, trunk: 9, r: 1, lean: -2, limb: 7, moss: 0.25, mossLen: 3 }),
  growTree({ seed: 37, trunk: 14, r: 1.3, lean: 1, limb: 8, moss: 0.25, mossLen: 4 }),
  growTree({ seed: 41, trunk: 7, r: 0.9, lean: 1, limb: 6, moss: 0.2, mossLen: 3 }),
];

const paintFar = (p: PixelPainter): void => {
  // a hazy line of drowned woods
  p.ridge((x) => farTop(x) - 3, FAR.back, 110);
  p.reseed(71);
  for (let x = 0; x < TILE_W; x += 5 + Math.floor(p.rand() * 6)) {
    const r = 2 + Math.floor(p.rand() * 2);
    p.ellipse(x, Math.round(farTop(x)) - 3, r + 1, r, FAR.back);
  }
  p.ridge(farTop, FAR.tree, 110);
  const farPal: Palette = { o: FAR.tree, l: FAR.tree, b: FAR.tree, d: FAR.tree, g: FAR.tree2, G: FAR.tree2, h: FAR.tree2 };
  const spots: [number, number][] = [
    [14, 0], [62, 1], [98, 3], [150, 2], [196, 0], [248, 3], [276, 1], [305, 2],
  ];
  for (const [x, k] of spots) plantTree(p, FAR_TREES[k], x, Math.round(farTop(x)) + 1, farPal);
  // fog swallowing the foot of the woods
  p.dither(0, 95, TILE_W, 1, FAR.fog, 4);
  p.dither(0, 96, TILE_W, 1, FAR.fog, 8);
  p.dither(0, 97, TILE_W, 1, FAR.fog, 12);
  p.rect(0, 98, TILE_W, 12, FAR.fog);
};

// ---------------------------------------------------------------- mid: still water + dead trees
const WATER_Y = 100;

const MID_TREES: { t: Tree; x: number; y: number }[] = [
  { t: growTree({ seed: 5, trunk: 36, r: 3.2, lean: 4, limb: 20, moss: 0.35, mossLen: 11 }), x: 38, y: 106 },
  { t: growTree({ seed: 17, trunk: 22, r: 2, lean: -3, limb: 13, moss: 0.3, mossLen: 7 }), x: 116, y: 103 },
  { t: growTree({ seed: 29, trunk: 44, r: 3.6, lean: -5, limb: 22, moss: 0.35, mossLen: 13 }), x: 182, y: 108 },
  { t: growTree({ seed: 53, trunk: 28, r: 2.4, lean: 3, limb: 15, moss: 0.35, mossLen: 9 }), x: 292, y: 104 },
];

const STUMP: Grid = [
  "..oo.o..",
  ".olbo.o.",
  ".olbbdo.",
  ".olbbdo.",
  "oolbbddo",
];

const paintMid = (p: PixelPainter): void => {
  // the still water, darker towards the viewer
  strata(
    p,
    [
      [WATER_Y, WATER.top],
      [105, WATER.base],
      [111, WATER.deep],
    ],
    124,
    0,
  );
  // horizontal ripple streaks reflecting the dusk
  p.reseed(19);
  for (let y = WATER_Y + 1; y < 122; y += 2) {
    const n = 10;
    for (let k = 0; k < n; k++) {
      const x = Math.floor(p.rand() * TILE_W);
      const len = 3 + Math.floor(p.rand() * 6) + Math.floor((y - WATER_Y) / 4);
      p.hline(x, y, len, y < 110 ? WATER.streak : WATER.top);
    }
  }
  // the moon's path on the water
  for (let y = WATER_Y + 1; y < 122; y += 2) {
    const k = (y - WATER_Y) / 18;
    const len = Math.round(10 - k * 4 + 2 * wave(y * 13, 1));
    p.hline(MOON_X - Math.floor(len / 2) + ((y >> 1) % 2), y, len, k < 0.5 ? WATER.glint : WATER.glint2);
  }
  // trees: reflection first, then the tussock and the tree
  for (const { t, x, y } of MID_TREES) {
    const left = x - t.base;
    const h = t.grid.length;
    // broken reflection: solid rows split by ripple gaps, no dither tail
    for (let k = 1; k < 10; k++) {
      const row = t.grid[h - 1 - k];
      if (!row || k % 3 === 0) continue;
      const off = k % 3 === 2 ? 1 : 0;
      for (let i = 0; i < row.length; i++) {
        if (row[i] === ".") continue;
        p.px(left + i + off, y + k, WATER.refl);
      }
    }
    // muddy tussock with roots
    const w = Math.round(t.grid[0].length * 0.18) + 6;
    p.ellipse(x, y + 1, w, 2, HAZETREE.o);
    p.ellipse(x, y + 1, w - 1, 1, HAZETREE.d);
    p.hline(x - w + 2, y, w, HAZETREE.b);
    plantTree(p, t, x, y, HAZETREE);
  }
  // stumps poke up just above the fog core so they read whole instead of as fragments
  for (const x of [84, 222]) {
    p.ellipse(x + 3, 104, 5, 1, HAZETREE.o);
    p.stamp(STUMP, x, 99, HAZETREE);
  }
};

// ---------------------------------------------------------------- drifting fog
const paintFog = (p: PixelPainter): void => {
  // a low bank of fog: a solid core with ordered-dither edges above and below
  for (let x = 0; x < TILE_W; x++) {
    const top = Math.round(103 + 2 * wave(x, 3, 1.1) + 1.5 * wave(x, 7, 0.3));
    const core = Math.round(107 + 1.5 * wave(x, 2, 2.2) + wave(x, 5, 0.9));
    const bot = core + 3 + Math.round(1.5 + 1.5 * wave(x, 4, 0.5));
    // the top edge breaks into thin horizontal tendrils instead of a checkerboard over the tree feet
    p.px(x, core - 1, FOG);
    if (wave(x, 9, 0.7) + 0.6 * wave(x, 23, 1.9) > 0.15) p.px(x, core - 3, FOG);
    if (wave(x, 6, 2.4) + 0.5 * wave(x, 17, 0.2) > 0.75 && top < core - 4) p.px(x, core - 5, FOG_THIN);
    for (let y = core; y < bot; y++) p.px(x, y, FOG);
    if (wave(x, 7, 1.3) > -0.2) p.px(x, bot + 1, FOG);
  }
  // a few long wisps higher up, each a clean two-row sliver
  const WISPS: [number, number, number][] = [[20, 92, 46], [118, 88, 34], [196, 94, 52], [274, 90, 30]];
  for (const [x, y, len] of WISPS) {
    p.hline(x + 4, y, len - 8, FOG_THIN);
    p.hline(x, y + 1, len, FOG_THIN);
    p.hline(x + 6, y + 2, len - 14, FOG_THIN);
  }
};

// ---------------------------------------------------------------- ground: far water, mud bank, near pool
const FAR_EDGE = (x: number): number => 121 + 2 * wave(x, 2, 0.9) + 1.5 * wave(x, 5, 2.3) + 0.8 * wave(x, 11, 0.4);
const NEAR_EDGE = (x: number): number => 157 + 2.5 * wave(x, 2, 2.6) + 1.5 * wave(x, 5, 0.6) + 0.8 * wave(x, 13, 1.7);

const LILY_S: Grid = ["dbbd"];
const LILY_M: Grid = [".lb.bb.", "dbbbbbd", ".dddd.."];
const LILY_L: Grid = ["..llb.bbb..", ".lbbbb.bbbd", "dbbbbbbbbbd", ".dbbbbbbbd.", "...ddddd..."];
const LILY_FLOWER: Grid = ["..f..", ".fFf.", "ffyFf", ".FFF."];

const reedClump = (seed: number, h: number, cattails: number): Grid => {
  const R = lcg(seed);
  const W = Math.round(h * 0.9) + 4;
  const g: string[][] = Array.from({ length: h }, () => new Array<string>(W).fill("."));
  const set = (x: number, y: number, c: string): void => {
    if (x >= 0 && y >= 0 && x < W && y < h) g[y][x] = c;
  };
  const cx = Math.floor(W / 2);
  const blades = Math.max(3, Math.round(h * 0.6));
  for (let i = 0; i < blades; i++) {
    const bx = cx + Math.round((R() - 0.5) * W * 0.4);
    const top = Math.floor(h * (0.15 + R() * 0.5));
    const lean = (R() - 0.5) * 1.6;
    const len = h - top;
    const c = i % 3 === 0 ? "l" : i % 3 === 1 ? "b" : "d";
    for (let j = 0; j < len; j++) {
      const t = j / len;
      const x = Math.round(bx + lean * t * t * len * 0.35);
      set(x, h - 1 - j, j === len - 1 && c !== "d" ? "h" : c);
    }
  }
  for (let k = 0; k < cattails; k++) {
    const x = cx + (k === 0 ? 0 : k % 2 ? -2 - k : 2 + k);
    const top = k === 0 ? 0 : 1 + Math.floor(R() * h * 0.25);
    for (let y = top + 1; y < h; y++) set(x, y, "s");
    set(x, top, "s");
    for (let y = top + 2; y < top + 6 && y < h; y++) {
      set(x, y, y === top + 2 ? "k" : "C");
      set(x + 1, y, "c");
    }
    set(x - 1, top + 3, "o");
  }
  // reed base: a little dark cluster
  for (let x = cx - 2; x <= cx + 2; x++) set(x, h - 1, "d");
  return g.map((r) => r.join(""));
};

const paintGround = (p: PixelPainter): void => {
  // mud strata (lighter far, darker near)
  strata(
    p,
    [
      [114, MUD.m0],
      [128, MUD.m1],
      [FLOOR_Y - 4, MUD.m2],
      [146, MUD.m3],
      [154, MUD.m4],
    ],
    p.h,
    3,
  );
  // back water: a dark strip between the reeds and the bank
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(FAR_EDGE(x));
    const top = 112 + Math.round(0.6 * wave(x, 9, 1));
    p.vline(x, top, e - top, POOL.top);
    p.px(x, top, WATER.top);
    if (e - top > 6) p.vline(x, top + 5, e - top - 5, POOL.base);
    p.px(x, e, MUD.edge);
    p.px(x, e + 1, MUD.lip);
    if (FAR_EDGE(x + 1) - FAR_EDGE(x - 1) < -0.3) p.px(x, e + 2, MUD.lip);
  }
  p.reseed(83);
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 114 + Math.floor(p.rand() * 4) * 2;
    if (y >= Math.round(FAR_EDGE(x)) - 1 || y >= Math.round(FAR_EDGE(x + 4)) - 1) continue;
    p.hline(x, y, 2 + Math.floor(p.rand() * 4), POOL.streak);
  }
  // a half-sunk mossy log in the back water
  const LOG: Grid = [
    ".......GgG.....Gg.......",
    ".oooooohGhoooooGhooooo..",
    "oyyollllllllllbbbbbbbdo.",
    "oyxyobbbbbdbbbbbbbbbbddo",
    "oyyyodbbbbbbbbbdbbbdddo.",
    ".oooddddddddddddddddoo..",
    "..rrrrrrrrrrrrrrrrrrr...",
    "....rrrr..rrrrrr.rr.....",
  ];
  p.stamp(LOG, 80, 112, { ...MIDTREE, r: POOL.rim, y: MUD.wet, x: MUD.m2 });
  // little lily pads on the back water
  for (const x of [22, 70, 131, 140, 205, 266, 300]) {
    const y = Math.round(FAR_EDGE(x)) - 3;
    if (y > 114) p.stamp(LILY_S, x, y, LILY);
  }

  // perspective texture on the bank: drag marks and wet ridges, longer and lower nearer
  p.reseed(311);
  for (let y = 126; y < 156; y += 2 + Math.floor((y - 120) / 10)) {
    const depth = (y - 120) / 36;
    const n = Math.round(8 + depth * 4);
    const len = 2 + Math.round(depth * 7);
    const shade = y < 128 ? MUD.m1 : y < 136 ? MUD.m2 : y < 146 ? MUD.m3 : MUD.m4;
    for (let k = 0; k < n; k++) {
      const x = Math.floor(p.rand() * TILE_W);
      if (y <= FAR_EDGE(x) + 3 || y <= FAR_EDGE(x + len) + 3 || y >= NEAR_EDGE(x) - 2) continue;
      p.hline(x, y, len, shade);
      p.hline(x + 1, y + 1, Math.max(1, len - 2), MUD.wet);
    }
  }
  // puddles reflecting the sky, bigger lower down
  p.reseed(57);
  const puddles: [number, number, number][] = [
    [30, 129, 5], [96, 127, 4], [168, 131, 6], [236, 128, 4], [292, 132, 5],
    [62, 147, 9], [138, 150, 7], [214, 146, 10], [278, 151, 7],
  ];
  for (const [x, y, r] of puddles) {
    const ry = Math.max(1, Math.round(r / 4));
    // water reflecting the dusk sky: lighter towards the near rim, a dark bank shadow on the far rim
    p.ellipse(x, y, r, ry, POOL.streak);
    p.hline(x - r + 2, y - ry, r * 2 - 3, MUD.dark);
    if (ry > 1) p.hline(x - r + 1, y - ry + 1, r * 2 - 1, POOL.top);
    p.hline(x - Math.floor(r / 2), y + ry - 1, r, WATER.streak);
    p.hline(x - r + 2, y + ry + 1, r * 2 - 3, MUD.wet);
  }
  // moss patches
  const MOSS_S: Grid = ["..lll..", ".lbbbl.", "dbbbbbd", ".ddddd."];
  const MOSS_L: Grid = ["...hll.l....", "..lbbblbbl..", ".lbbbbbbbbbl", "dbbbbbbbbbdd", ".dddbbbdddd.", "....dddd...."];
  for (const [x, y] of [[50, 125], [124, 131], [196, 124], [262, 133]] as [number, number][]) p.stamp(MOSS_S, x, y, MOSS);
  for (const [x, y] of [[8, 143], [104, 140], [180, 152], [250, 141]] as [number, number][]) p.stamp(MOSS_L, x, y, MOSS);
  // dark wet hollows in the mud: a shadowed far rim and a damp lit near rim
  const hollows: [number, number, number][] = [[80, 133, 7], [150, 125, 5], [226, 137, 9], [300, 126, 6], [18, 150, 12], [176, 145, 8]];
  for (const [x, y, r] of hollows) {
    const ry = Math.max(1, Math.round(r / 5));
    p.ellipse(x, y, r, ry, MUD.m4);
    p.hline(x - r + 2, y - ry, r * 2 - 3, MUD.dark);
    p.hline(x - r + 3, y + ry + 1, r * 2 - 5, MUD.wet);
  }
  // clods and stones, bigger lower down
  const CLOD_S: Grid = [".l.", "lbd", ".d."];
  const CLOD_M: Grid = [".ll.", "lbbd", ".dd."];
  const CLOD_L: Grid = ["..ll...", ".lbbbd.", "lbbbbbd", ".ddddd."];
  const clodPal: Palette = { l: MUD.wet, b: MUD.m1, d: MUD.dark };
  p.reseed(613);
  for (let k = 0; k < 20; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 125 + Math.floor(p.rand() * 30);
    if (y <= FAR_EDGE(x) + 3 || y + 4 >= NEAR_EDGE(x) - 2) continue;
    const g = y < 133 ? CLOD_S : y < 146 ? CLOD_M : CLOD_L;
    p.stamp(g, x, y, clodPal);
  }
  // sedge tufts: tiny far away, taller near
  const SEDGE: Grid[] = [["l.l", "dld"], ["..l..", "l.l.l", "dldld"], ["...l...", ".l.l..l", ".ldl.l.", "ldddldl"], ["....h....", ".l..l..l.", ".ll.ld.l.", "..ldldll.", "ldddddddl"]];
  const sedgePal: Palette = { l: MOSS.l, h: MOSS.h, d: MOSS.d };
  // grouped into a few clumps (moss islands, the reed feet) so the bank reads as clusters, not speckle
  p.reseed(4242);
  const clumps: [number, number][] = [[54, 127], [128, 134], [200, 126], [266, 136], [12, 147], [108, 143], [184, 154], [254, 144], [306, 129]];
  for (const [cx, cy] of clumps) {
    const n = 2 + Math.floor(p.rand() * 3);
    for (let k = 0; k < n; k++) {
      const depth = (cy - 124) / 32;
      const x = cx + Math.round((p.rand() - 0.5) * (8 + depth * 14));
      const y = cy + Math.round((p.rand() - 0.5) * 3);
      if (y <= FAR_EDGE(x) + 3 || y >= NEAR_EDGE(x) - 3 || y >= NEAR_EDGE(x + 8) - 3) continue;
      const g = y < 130 ? SEDGE[0] : y < 140 ? SEDGE[1] : y < 150 ? SEDGE[2] : SEDGE[3];
      plant(p, g, x, y, sedgePal);
    }
  }
  // roots arching out of the mud near the front
  const ROOT: Grid = ["...oooo....", "..olllbo...", ".olbbbbdo..", "olbdo.obdo.", "obdo...odo.", "odo.....oo."];
  for (const x of [118, 268]) p.stamp(ROOT, x, Math.round(NEAR_EDGE(x)) - 7, MIDTREE);

  // near pool
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(NEAR_EDGE(x));
    p.px(x, e - 2, MUD.wet);
    p.px(x, e - 1, MUD.dark);
    p.vline(x, e, 4, POOL.rim);
    p.vline(x, e + 1, p.h - e - 1, POOL.top);
    p.vline(x, e + 6, p.h - e - 6, POOL.base);
    p.vline(x, e + 14, p.h - e - 14, POOL.deep);
    p.px(x, e, POOL.rim);
  }
  p.dither(0, 160, TILE_W, 3, POOL.base, 8);
  p.dither(0, 168, TILE_W, 3, POOL.deep, 8);
  // ripple streaks, longer nearer
  p.reseed(77);
  for (let y = 161; y < p.h; y += 3) {
    for (let k = 0; k < 9; k++) {
      const x = Math.floor(p.rand() * TILE_W);
      if (y <= NEAR_EDGE(x) + 2) continue;
      const len = 4 + Math.floor(p.rand() * 5) + Math.floor((y - 160) / 3);
      p.hline(x, y, len, y < 168 ? POOL.streak : POOL.base);
      if (y < 168) p.hline(x + 2, y + 1, len - 4, POOL.base);
    }
  }
  // lily pads on the near pool, some flowering
  const pads: [number, number, Grid][] = [
    [20, 166, LILY_L], [88, 171, LILY_M], [150, 164, LILY_M], [196, 172, LILY_L], [244, 165, LILY_M], [300, 170, LILY_M],
  ];
  for (const [x, y, g] of pads) if (y > NEAR_EDGE(x) + 3) p.stamp(g, x, y, LILY);
  p.stamp(LILY_FLOWER, 23, 163, LILY);
  p.stamp(LILY_FLOWER, 199, 169, LILY);

  // reeds and cattails along both banks
  const farReeds: [number, number, number][] = [[6, 10, 1], [14, 7, 0], [58, 8, 1], [110, 11, 1], [158, 7, 0], [232, 12, 1], [240, 8, 0], [284, 9, 1]];
  farReeds.forEach(([x, h, c], i) => plant(p, reedClump(100 + i, h, c), x, Math.round(FAR_EDGE(x)) + 1, REED));
  const nearReeds: [number, number, number][] = [[42, 18, 2], [128, 13, 1], [226, 20, 2], [236, 12, 0], [312, 15, 1]];
  nearReeds.forEach(([x, h, c], i) => plant(p, reedClump(200 + i, h, c), x, Math.round(NEAR_EDGE(x)) + 1, REED));
};

// ---------------------------------------------------------------- foreground silhouettes
const paintFront = (p: PixelPainter): void => {
  const pal: Palette = { d: FRONT.a, b: FRONT.b, l: FRONT.c, h: FRONT.c, s: FRONT.a, k: FRONT.c, C: FRONT.a, c: FRONT.b, o: FRONT.a };
  // a dark muddy lip with tall reeds and cattails at a few spots
  for (let x = 0; x < TILE_W; x++) {
    const h = Math.round(4 + 2 * wave(x, 5, 0.4) + wave(x, 13, 1.1));
    p.vline(x, p.h - h, h, FRONT.a);
    p.px(x, p.h - h - 1, FRONT.b);
  }
  const clumps: [number, number, number][] = [[4, 22, 2], [16, 15, 0], [104, 16, 1], [186, 21, 2], [198, 13, 0], [268, 15, 1]];
  clumps.forEach(([x, h, c], i) => plant(p, reedClump(400 + i, h, c), x, p.h - 3, pal));
};

const field: Battlefield = {
  terrain: "swamp",
  ambient: "fireflies",
  ambientColors: ["#d8f080", "#b4e060", "#f0f4b0"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.5, paint: paintMid },
    { parallax: 0.6, drift: 3, paint: paintFog },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
