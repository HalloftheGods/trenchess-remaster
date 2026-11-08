import type { Battlefield } from "../field";
import type { Palette } from "../palette";
import { TILE_W, wave, type PixelPainter } from "../painter";

/**
 * "The Endless Sands": a blazing desert sunset.
 * Sky bands from dusky plum to molten gold, a huge low striped sun, backlit stratus banks,
 * pale flat-topped mesas in the haze, rolling dunes with lit windward faces and shadowed lee
 * troughs, and a warm sand floor with wind ripples and a few bleached bones and rocks.
 */

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const bayer = (x: number, y: number): number => BAYER[((y % 4) + 4) % 4][((((x % TILE_W) + TILE_W) % TILE_W) % 4 + 4) % 4];
const wrap = (x: number): number => ((x % TILE_W) + TILE_W) % TILE_W;

// ---------------------------------------------------------------- sky
const SKY_TOP = 0;
const HORIZON = 106;
const SKY = ["#3c1a4c", "#5e2258", "#88305e", "#b0405c", "#d45a4c", "#ea7a3e", "#f49a3e", "#f9bc52", "#fcd876"];

const SUN_X = 168;
const SUN_Y = 92;
const SUN_R = 34;

function paintSky(p: PixelPainter): void {
  p.bands(SKY_TOP, HORIZON, SKY, 4);

  // Soft glow rings around the sun: two dithered steps of the horizon gold.
  for (let y = SUN_Y - SUN_R - 14; y < HORIZON; y++)
    for (let x = SUN_X - SUN_R - 18; x <= SUN_X + SUN_R + 18; x++) {
      const dx = x - SUN_X;
      const dy = (y - SUN_Y) * 1.15;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < SUN_R + 5 && bayer(x, y) < 8) p.px(x, y, "#fde08a");
      else if (d < SUN_R + 11 && bayer(x, y) < 4) p.px(x, y, "#fcd06e");
    }

  // The sun: pale core, gold rim on the lower right, and the classic sunset stripes cut through
  // its lower half (gaps widen toward the horizon).
  for (let y = -SUN_R; y <= SUN_R; y++) {
    const yy = SUN_Y + y;
    if (yy >= HORIZON) break;
    const half = Math.floor(SUN_R * Math.sqrt(1 - (y * y) / (SUN_R * SUN_R)) + 0.35);
    for (let x = -half; x <= half; x++) {
      const rim = Math.sqrt((x + 6) * (x + 6) + (y + 8) * (y + 8));
      let c = "#fff6c8";
      if (rim > SUN_R + 4) c = "#ffd86a";
      else if (rim > SUN_R - 3) c = "#ffe896";
      p.px(SUN_X + x, yy, c);
    }
  }
  // Stripes: [offset below centre, thickness].
  const stripes: [number, number][] = [
    [2, 1],
    [7, 1],
    [11, 2],
    [15, 2],
  ];
  for (const [off, th] of stripes)
    for (let t = 0; t < th; t++) {
      const yy = SUN_Y + off + t;
      const half = Math.floor(SUN_R * Math.sqrt(Math.max(0, 1 - ((off + t) * (off + t)) / (SUN_R * SUN_R))) + 0.35);
      p.hline(SUN_X - half, yy, half * 2 + 1, "#fcd06e");
    }
}

// ---------------------------------------------------------------- clouds
/**
 * A sunset cumulus bank built from overlapping squashed discs (each one steps evenly as a pixel
 * ellipse). Backlit by the low sun, every lump has a plum cap, a rose body and a warm lower rim;
 * lumps listed later sit in front, so their caps draw the internal contours. The whole bank sits
 * on a flat blazing underside that tapers at the ends.
 */
function cloud(p: PixelPainter, x: number, y: number, lumps: [number, number][], lit: boolean): void {
  const CAP = lit ? "#a0405e" : "#5a2456";
  const SEAM = lit ? "#b44a5c" : "#682858";
  const BODY = lit ? "#c8565a" : "#7a2c5a";
  const WARM = lit ? "#f08a4a" : "#a43c5a";
  const UNDER = lit ? "#ffd27a" : "#d05a52";
  // Rasterise into a local map first: the outer silhouette gets the dark cap, while the seams where
  // a front lump overlaps a back one get a softer contour, so the bank reads as one volume.
  const cells = new Map<string, string>();
  const key = (i: number, j: number): string => `${i},${j}`;
  for (const [cx, r] of lumps) {
    const ry = Math.max(2, Math.round(r * 0.62));
    const cy = y - Math.round(ry * 0.45);
    for (let dy = -ry; dy <= ry; dy++) {
      const yy = cy + dy;
      if (yy > y) break;
      const half = Math.floor(r * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))) + 0.35);
      if (half < 2) continue; // no single-pixel nubs on top of a lump
      for (let dx = -half; dx <= half; dx++) {
        const edge = Math.floor(ry * Math.sqrt(Math.max(0, 1 - (dx * dx) / (r * r))) + 0.35);
        const fromTop = dy + edge;
        const i = cx + dx;
        const covered = cells.has(key(i, yy));
        let c = BODY;
        if (fromTop < (ry >= 6 ? 2 : 1)) c = covered ? SEAM : CAP;
        else if (yy >= y - 1 - (ry >= 6 ? 1 : 0)) c = WARM;
        cells.set(key(i, yy), c);
      }
    }
  }
  // Any pixel open to the sky above is silhouette: give it the cap colour.
  for (const [k, c] of cells) {
    const [i, j] = k.split(",").map(Number);
    let out = c;
    if (!cells.has(key(i, j - 1))) out = CAP;
    else if (c === CAP) out = SEAM;
    p.px(x + i, j, out);
  }
  // Flat blazing underside, inset from the ends so it never sticks out as a hairline.
  let x0 = 999;
  let x1 = -999;
  for (const [cx, r] of lumps) {
    x0 = Math.min(x0, cx - r);
    x1 = Math.max(x1, cx + r);
  }
  p.hline(x + x0 + 3, y, x1 - x0 - 5, UNDER);
}

function paintClouds(p: PixelPainter): void {
  // High banks in the plum sky.
  cloud(p, 8, 34, [[8, 8], [22, 14], [38, 18], [56, 13], [70, 10], [82, 6]], false);
  cloud(p, 196, 28, [[6, 7], [20, 13], [36, 17], [52, 12], [66, 8]], false);
  cloud(p, 128, 44, [[4, 5], [12, 8], [21, 6]], false);
  // Low banks drifting across the sun, their undersides blazing.
  cloud(p, 92, 70, [[6, 6], [16, 11], [30, 15], [46, 10], [58, 12], [70, 6]], true);
  cloud(p, 190, 80, [[4, 5], [13, 9], [24, 7], [32, 4]], true);
  cloud(p, 2, 70, [[6, 7], [17, 12], [30, 9], [40, 5]], true);
  cloud(p, 262, 66, [[5, 6], [15, 10], [26, 7], [34, 4]], true);
}

// ---------------------------------------------------------------- mesas
interface Mesa {
  x: number;
  w: number;
  top: number;
}
const MESA_BASE = 114;
const MESAS: Mesa[] = [
  { x: 128, w: 26, top: 86 },
  { x: 72, w: 10, top: 91 },
  { x: 300, w: 9, top: 92 },
  { x: 10, w: 44, top: 77 },
  { x: 226, w: 54, top: 75 },
];

const M = {
  cap: "#ecac94",
  lit: "#dc8a84",
  body: "#c66e7a",
  strata: "#b65e76",
  shade: "#a65476",
  deep: "#904a72",
  talus: "#d08a84",
  haze: "#e6a688",
};

/**
 * A flat-topped mesa: a caprock lip that overhangs by a pixel, a sheer cliff (lit left edge, body,
 * shaded right third) cut by vertical erosion grooves and two strata lines, then a talus apron that
 * flares out to the base with an even 1-1-2-2-3 step.
 */
function mesa(p: PixelPainter, m: Mesa, seed: number): void {
  const h = MESA_BASE - m.top;
  const cliffH = Math.round(h * 0.48);
  const capBot = m.top + 3;
  const cliffBot = m.top + cliffH;
  const batterL = (y: number): number => Math.floor((y - capBot) / 5);
  const batterR = (y: number): number => Math.floor((y - capBot) / 6);
  const mid = m.x + m.w / 2;
  // Gullies scoring the talus: they start under the cliff and fan out as they run down.
  p.reseed(seed);
  const gullies: number[] = [];
  for (let gx = 3 + Math.floor(p.rand() * 3); gx < m.w * 0.62; gx += 6 + Math.floor(p.rand() * 4)) gullies.push(m.x + gx);
  for (let y = m.top; y < MESA_BASE; y++) {
    let L = m.x;
    let R = m.x + m.w;
    const t = y - cliffBot;
    if (y < capBot) {
      // Caprock: overhangs one pixel, the top row rounded in by one.
      L -= y === m.top ? 0 : 1;
      R += y === m.top ? 0 : 1;
    } else if (t < 0) {
      L -= batterL(y);
      R += batterR(y);
    } else {
      L -= batterL(cliffBot) + Math.floor(t * 0.7 + (t * t) / 9);
      R += batterR(cliffBot) + Math.floor(t * 0.7 + (t * t) / 9);
    }
    const shadeX = m.x + Math.round(m.w * 0.7) + (t < 0 ? Math.floor((y - capBot) / 6) : batterR(cliffBot) + Math.floor(t * 0.4));
    for (let x = L; x <= R; x++) {
      let c: string;
      if (y < capBot) {
        const row = y - m.top;
        if (x > shadeX) {
          if (row === 0) c = M.lit;
          else if (row === 1) c = M.shade;
          else c = M.deep;
        } else if (row === 0) c = M.cap;
        else if (row === 1) c = M.lit;
        else c = M.strata;
      } else if (t < 0) {
        const rel = y - capBot;
        c = M.body;
        if (x <= L + 1 && rel > 0) c = M.lit;
        if (rel === 5 || (rel === 10 && cliffH > 14)) c = M.strata;
        if (x > shadeX) c = x === R || rel === 5 || rel === 10 ? M.deep : M.shade;
      } else {
        // Talus apron: dusty, its right flank in shade, its left edge catching the light.
        c = M.talus;
        if (x <= L + 1) c = M.cap;
        for (const g of gullies) {
          const gx = Math.round(g + ((g - mid) * t) / 10);
          if (x === gx) c = M.body;
          else if (x === gx - 1 && c === M.talus && t > 0) c = M.cap;
        }
        if (t === 0 && x > L + 1) c = M.body;
        if (x > shadeX) c = t === 0 ? M.deep : M.shade;
      }
      p.px(x, y, c);
    }
  }
}

function paintMesas(p: PixelPainter): void {
  // A low far ridge in haze behind and between the mesas.
  p.ridge((x) => 101 + 1.5 * wave(x, 3, 0.4) + 1 * wave(x, 7, 2.1), M.talus, 112);
  for (let x = 0; x < TILE_W; x++) p.px(x, Math.round(101 + 1.5 * wave(x, 3, 0.4) + 1 * wave(x, 7, 2.1)), M.cap);
  MESAS.forEach((m, i) => mesa(p, m, 101 + i * 37));
  // Atmospheric haze pooling at the foot of the range.
  p.dither(0, 104, TILE_W, 2, M.haze, 4);
  p.dither(0, 106, TILE_W, 2, M.haze, 8);
  p.dither(0, 108, TILE_W, 2, M.haze, 12);
  p.rect(0, 110, TILE_W, 8, M.haze);
}

// ---------------------------------------------------------------- dunes
interface Crest {
  x: number;
  y: number;
}

/** Surface of a dune row: gentle convex windward rise to a sharp brink, then a steep lee face. */
function duneSurface(crests: Crest[], depth: number, x: number): { y: number; crest: Crest; u: number; lee: boolean } {
  const n = crests.length;
  for (let i = 0; i < n; i++) {
    const a = crests[i];
    const b = crests[(i + 1) % n];
    const bx = b.x + (i + 1 === n ? TILE_W : 0);
    const xx = x < a.x ? x + TILE_W : x;
    if (xx < a.x || xx >= bx) continue;
    const span = bx - a.x;
    const xt = a.x + span * 0.32;
    const yt = Math.max(a.y, b.y) + depth;
    if (xx < xt) {
      const u = (xx - a.x) / (xt - a.x);
      return { y: a.y + (yt - a.y) * Math.sin((u * Math.PI) / 2), crest: a, u, lee: true };
    }
    const u = (xx - xt) / (bx - xt);
    return { y: yt + (b.y - yt) * Math.sin((u * Math.PI) / 2), crest: b, u, lee: false };
  }
  return { y: crests[0].y, crest: crests[0], u: 0, lee: false };
}

function paintDuneRow(
  p: PixelPainter,
  crests: Crest[],
  depth: number,
  colors: { crest: string; lit: string; body: string; shade: string; deep: string },
  bottom: number,
  lean: number,
): void {
  const surf = (x: number): number => Math.round(duneSurface(crests, depth, wrap(x)).y);
  for (let x = 0; x < TILE_W; x++) {
    const s = duneSurface(crests, depth, x);
    const top = Math.round(s.y);
    for (let y = top; y < bottom; y++) p.px(x, y, colors.body);
    // Lit windward face: a 2px band hugging the surface, a bright brink near the crest.
    if (!s.lee) {
      p.px(x, top + 1, colors.lit);
      p.px(x, top, s.u > 0.5 ? colors.crest : colors.lit);
    }
  }
  // Slip faces: a shadow triangle under every brink. Its left edge drops from the crest leaning
  // right, its right edge climbs back from the trough, so both edges are clean diagonals.
  crests.forEach((c, i) => {
    const b = crests[(i + 1) % crests.length];
    const bx = b.x + (i + 1 === crests.length ? TILE_W : 0);
    const xt = c.x + (bx - c.x) * 0.32;
    const yt = Math.max(c.y, b.y) + depth;
    for (let y = c.y; y < bottom; y++) {
      const left = Math.round(c.x + 1 + (y - c.y) * lean);
      const right = Math.round(xt + 4 - Math.max(0, y - yt) * 1.6);
      for (let x = left; x <= right; x++) {
        const sy = surf(x);
        if (y < sy) continue;
        p.px(x, y, y === sy && x < xt ? colors.deep : colors.shade);
      }
    }
  });
}

function paintFarDunes(p: PixelPainter): void {
  const crests: Crest[] = [
    { x: 30, y: 104 },
    { x: 96, y: 107 },
    { x: 150, y: 103 },
    { x: 214, y: 106 },
    { x: 268, y: 102 },
  ];
  paintDuneRow(p, crests, 6, { crest: "#f6c27c", lit: "#eaa468", body: "#d68462", shade: "#bc6a68", deep: "#a85a66" }, 124, 0.9);
}

function paintMidDunes(p: PixelPainter): void {
  const crests: Crest[] = [
    { x: 12, y: 109 },
    { x: 88, y: 105 },
    { x: 176, y: 110 },
    { x: 246, y: 107 },
  ];
  paintDuneRow(p, crests, 9, { crest: "#fcd488", lit: "#f2b46a", body: "#e09458", shade: "#c26e58", deep: "#a45656" }, 128, 0.9);
}

// ---------------------------------------------------------------- ground
const SAND = ["#eeaa62", "#e69c58", "#da8c50", "#cc7c4a", "#bc6c44"];
const SAND_STOPS = [113, 122, 131, 141, 152];

function sandAt(x: number, y: number): string {
  let i = 0;
  while (i + 1 < SAND_STOPS.length && y >= SAND_STOPS[i + 1]) i++;
  // Dithered seam over the 3 rows above each stop.
  if (i + 1 < SAND_STOPS.length) {
    const toNext = SAND_STOPS[i + 1] - y;
    if (toNext <= 3 && bayer(x, y) < (4 - toNext) * 4) return SAND[i + 1];
  }
  return SAND[i];
}

const groundTop = (x: number): number => 115 + 1.4 * wave(x, 2, 0.8) + 0.8 * wave(x, 5, 2.4);

/** Wind ripples: [base y, amplitude, cycles, phase, thickness, dash cycles]. Bigger and wider apart lower down. */
const RIPPLES: [number, number, number, number, number, number][] = [
  [122, 0.8, 8, 1.7, 1, 6],
  [128, 1.0, 7, 0.9, 1, 5],
  [134, 1.3, 6, 2.6, 1, 5],
  [145, 1.7, 5, 1.2, 2, 4],
  [154, 2.2, 4, 0.2, 2, 3],
  [165, 2.8, 3, 2.0, 2, 3],
];

function paintGround(p: PixelPainter): void {
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(groundTop(x));
    for (let y = t; y < p.h; y++) p.px(x, y, sandAt(x, y));
    // Lit lip on the near rise.
    p.px(x, t, "#f8c47a");
    if (groundTop(x + 1) > groundTop(x - 1)) p.px(x, t + 1, "#f2b46c");
  }

  // Ripples: a lit crest row over a shadow row, broken into long dashes.
  RIPPLES.forEach(([by, amp, n, ph, th, dash], k) => {
    const gap = by < 130 ? 0.25 : -0.15; // the far ripples are sparser so the distance stays calm
    for (let x = 0; x < TILE_W; x++) {
      const d = wave(x, dash, ph * 2 + k);
      if (d < gap) continue;
      const y = Math.round(by + amp * wave(x, n, ph));
      const end = d < gap + 0.25;
      const base = sandAt(x, y);
      const lit = base === SAND[0] || base === SAND[1] ? "#f6be74" : "#e8a25e";
      const dark = SAND_STOPS.findIndex((s) => s > y);
      const shade = SAND[Math.min(SAND.length - 1, (dark < 0 ? SAND.length : dark) + 1)] ?? "#a85c40";
      if (!end) p.px(x, y, lit);
      for (let j = 1; j <= th; j++) p.px(x, y + j, j === th && th > 1 ? "#a85c40" : shade);
    }
  });

  // Props: bones and bleached rocks, kept off the fighters' centre and low in contrast.
  ribs(p, 22, 125);
  p.stamp(SKULL, 70, 124, PROPS);
  p.stamp(ROCK_BIG, 266, 122, PROPS);
  p.stamp(ROCK_SMALL, 284, 129, PROPS);
  p.stamp(PEBBLE, 112, 133, PROPS);
  p.stamp(PEBBLE, 236, 127, PROPS);
}

const PROPS: Palette = {
  o: "#6a2e3a",
  a: "#fff2da",
  b: "#ecd2a8",
  c: "#c09a78",
  d: "#8a5a50",
  z: "#b0603e",
};

const SKULL: string[] = [
  "o...........o",
  "oa.........co",
  ".obooooooooc.",
  "..oabbbbbbco.",
  "..oaddbddco..",
  "...oabbbco...",
  "...oadbdco...",
  "....oaacoz...",
  ".zzzzooozzzz.",
];

/**
 * A half-buried rib cage seen from the side: a knobbly spine arching over the sand with five ribs
 * hanging from it, each curving out (1-1-1-0-1 step) and sinking into a drift. 2px bones (lit
 * left, shaded right) inside a 1px warm-dark outline.
 */
function ribs(p: PixelPainter, x0: number, base: number): void {
  const O = PROPS.o;
  const spineY = (x: number): number => base - 12 + Math.floor(Math.abs(x - x0 - 12) / 9);
  const CURVE = [0, 1, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4];
  const ribX = [x0 + 3, x0 + 9, x0 + 15, x0 + 21, x0 + 26];
  const path = (rx: number): [number, number][] => {
    const pts: [number, number][] = [];
    for (let y = spineY(rx) + 2, j = 0; y <= base; y++, j++) pts.push([rx + CURVE[Math.min(j, CURVE.length - 1)], y]);
    return pts;
  };
  // Outlines first, then the bone fills, so neighbouring bones never eat each other.
  for (const rx of ribX) for (const [x, y] of path(rx)) {
    p.px(x - 1, y, O);
    p.px(x + 2, y, O);
  }
  for (let x = x0 - 2; x <= x0 + 30; x++) {
    const y = spineY(x);
    p.px(x, y - 1, O);
    p.px(x, y + 2, O);
    if ((x - x0) % 4 === 1 && x > x0 && x < x0 + 29) {
      p.px(x, y - 2, O);
      p.px(x - 1, y - 1, O);
      p.px(x + 1, y - 1, O);
    }
  }
  p.vline(x0 - 3, spineY(x0 - 2), 2, O);
  p.vline(x0 + 31, spineY(x0 + 30), 2, O);
  for (const rx of ribX) for (const [x, y] of path(rx)) {
    p.px(x, y, PROPS.a);
    p.px(x + 1, y, PROPS.c);
  }
  for (let x = x0 - 2; x <= x0 + 30; x++) {
    const y = spineY(x);
    p.px(x, y, PROPS.a);
    p.px(x, y + 1, PROPS.c);
    if ((x - x0) % 4 === 1 && x > x0 && x < x0 + 29) p.px(x, y - 1, PROPS.b);
  }
  // Sand drifted over the rib ends: a lit crest, then the drift body, then its shadow side.
  for (let x = x0 - 6; x <= x0 + 36; x++) {
    const d = Math.abs(x - (x0 + 15));
    const top = base - 1 + Math.floor((d * d) / 120);
    p.px(x, top, "#f8c47a");
    for (let y = top + 1; y <= base + 2; y++) p.px(x, y, y === top + 1 ? "#f2b46c" : "#eaa660");
  }
  p.hline(x0 - 4, base + 3, 38, "#da8c50");
}

const ROCK_BIG: string[] = [
  "......oooo.......",
  "....ooaaabo......",
  "...oaaabbbcoooo..",
  "..oaabbbbccbbbco.",
  ".oabbbbbccccbccco",
  "oabbbbcccccccccdo",
  "obbbccccccdddddo.",
  ".ooooooooooooooz.",
  "..zzzzzzzzzzzzz..",
];

const ROCK_SMALL: string[] = [
  "..ooo...",
  ".oaabo..",
  "oabbcco.",
  "obcccdo.",
  ".ooooozz",
];

const PEBBLE: string[] = [".oo.", "oabo", "oocoz", ".zzz"];

// ---------------------------------------------------------------- foreground
function paintFront(p: PixelPainter): void {
  const DARK = "#3e1a2c";
  const RIM = "#6a2e3a";
  // A low dark dune lip along the very bottom.
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(169 + 3 * wave(x, 2, 1.1) + 1.5 * wave(x, 5, 0.3));
    p.vline(x, t, p.h - t, DARK);
    p.px(x, t, RIM);
  }
  // Two dark rock silhouettes and a dry grass tuft breaking above it.
  p.stamp(FRONT_ROCK, 20, 158, { o: DARK, r: RIM });
  p.stamp(FRONT_ROCK, 196, 160, { o: DARK, r: RIM });
  p.stamp(TUFT, 120, 158, { o: DARK, r: RIM });
}

const FRONT_ROCK: string[] = [
  ".......rr..........",
  "......roorr........",
  ".....rooooor.......",
  "....roooooooorr....",
  "...roooooooooooor..",
  "..rooooooooooooooo.",
  "..ooooooooooooooooo",
  ".rooooooooooooooooo",
  ".oooooooooooooooooo",
  "roooooooooooooooooo",
  "ooooooooooooooooooo",
  "ooooooooooooooooooo",
  "ooooooooooooooooooo",
  "ooooooooooooooooooo",
  "ooooooooooooooooooo",
  "ooooooooooooooooooo",
  "ooooooooooooooooooo",
  "ooooooooooooooooooo",
  "ooooooooooooooooooo",
  "ooooooooooooooooooo",
];

const TUFT: string[] = [
  "o......o.....",
  ".o..o..o...o.",
  ".o..o.o...o..",
  "..o.o.o..o...",
  "..o..oo.o..o.",
  "...o.oooo.o..",
  "...ooooooo...",
  "..ooooooooo..",
  ".ooooooooooo.",
  "ooooooooooooo",
  "ooooooooooooo",
  "ooooooooooooo",
  "ooooooooooooo",
  "ooooooooooooo",
  "ooooooooooooo",
  "ooooooooooooo",
  "ooooooooooooo",
  "ooooooooooooo",
  "ooooooooooooo",
  "ooooooooooooo",
  "ooooooooooooo",
  "ooooooooooooo",
];

const field: Battlefield = {
  terrain: "desert",
  ambient: "sand",
  ambientColors: ["#fcd890", "#f2b46a", "#fff0c4"],
  layers: [
    { parallax: 0.04, paint: paintSky },
    { parallax: 0.08, drift: 2, paint: paintClouds },
    { parallax: 0.2, paint: paintMesas },
    {
      parallax: 0.45,
      paint: (p) => {
        paintFarDunes(p);
        paintMidDunes(p);
      },
    },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
