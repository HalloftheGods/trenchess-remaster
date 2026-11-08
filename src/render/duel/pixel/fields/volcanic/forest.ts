import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import { ASH_COLORS, LAVA, RANGE_BACK, RANGE_FAR, SMOKE, bandIndex, embers, paintSky, paintSmoke, paintVolcanoes, plume, strata } from "./common";

/**
 * Volcanic "Whispering Woods": a burnt grove. Black, leafless trunks still glowing in their cracks
 * stand against a red sky thick with smoke; the floor is scorched earth under a drift of grey ash,
 * littered with embers and fallen charred limbs.
 */

// ---------------------------------------------------------------- palettes
const FAR_TREE = "#5a1c12";
const BACK_TREE = { body: "#2a100c", rim: "#6a2416" };
const TREE = { body: "#140c0a", dark: "#0a0606", rim: "#5a2216", rim2: "#3a1610", crack: LAVA.ember, hot: LAVA.hot };
const GSTOPS: [number, string][] = [
  [112, "#4a2620"],
  [117, "#442c26"],
  [123, "#40302a"],
  [132, "#3c2e2a"],
  [146, "#322826"],
  [160, "#261e1c"],
];
const ASH = { lit: "#6a6260", base: "#5a5250", shade: "#4a4240", edge: "#2e2420" };
const LOG = { o: "#0e0806", d: "#1c120e", l: "#3a2a24", e: LAVA.ember, h: LAVA.hot };

// ---------------------------------------------------------------- sky + far
const paintSkyLayer = (p: PixelPainter): void => paintSky(p, 112, 110, 47);

const paintSmokeLayer = (p: PixelPainter): void =>
  paintSmoke(p, [
    [0, 26, 120, 9],
    [150, 18, 110, 7],
    [60, 50, 80, 6],
    [196, 58, 100, 7],
    [20, 80, 60, 4],
    [250, 86, 50, 3],
  ]);

const backRidge = (x: number): number => 92 - 3 * wave(x, 2, 0.6) - 2 * wave(x, 5, 2.2);
const farRidge = (x: number): number => 102 - 3 * wave(x, 3, 1.9) - 1.5 * wave(x, 7, 0.4);

const paintFar = (p: PixelPainter): void => {
  paintVolcanoes(p, backRidge, [{ x: 110, y: 72, crater: 4, slope: 0.85 }], RANGE_BACK, 112, true);
  plume(p, 110, 70, 22, SMOKE);
  paintVolcanoes(p, farRidge, [], RANGE_FAR, 112, false);
  // a burnt forest on the far ridge: bare spikes of trunks
  p.reseed(61);
  for (let x = 0; x < TILE_W; x += 3 + Math.floor(p.rand() * 5)) {
    const t = Math.round(farRidge(x));
    const h = 4 + Math.floor(p.rand() * 6);
    p.vline(x, t - h, h, FAR_TREE);
    if (h > 6) p.px(x + (x % 2 === 0 ? 1 : -1), t - h + 2, FAR_TREE);
  }
};

// ---------------------------------------------------------------- dead trees

interface TreePal {
  body: string;
  rim: string;
  dark?: string;
  rim2?: string;
  crack?: string;
  hot?: string;
}

/** A bare limb: a Bresenham line that forks into two twigs near its end. */
const limb = (p: PixelPainter, x: number, y: number, dx: number, dy: number, c: string, depth: number): void => {
  const ex = x + dx, ey = y + dy;
  p.line(x, y, ex, ey, c);
  if (depth <= 0) return;
  const s = Math.sign(dx) || 1;
  limb(p, ex, ey, s * Math.max(1, Math.round(Math.abs(dx) * 0.5)), Math.round(dy * 0.6), c, depth - 1);
  limb(p, ex, ey, -s * Math.max(1, Math.round(Math.abs(dx) * 0.2)), Math.round(dy * 0.7), c, depth - 1);
};

/**
 * A charred dead tree: a tapering trunk with a flared root, the left edge lit red by the sky,
 * bare forked limbs, and (when the palette has a crack colour) a glowing split down its middle.
 */
const deadTree = (p: PixelPainter, x: number, base: number, h: number, w: number, pal: TreePal, seed: number, limbs = -1): void => {
  const top = base - h;
  for (let y = top; y < base; y++) {
    const u = (y - top) / h;
    let tw = Math.max(1, Math.round(w * (0.45 + 0.55 * u)));
    if (base - y <= 3) tw += 4 - (base - y);
    const lx = x - Math.floor(tw / 2) + Math.round(wave(y * 4, 1, seed) * 0.6);
    p.hline(lx, y, tw, pal.body);
    if (tw >= 2) p.px(lx, y, pal.rim);
    if (pal.dark && tw >= 3) p.px(lx + tw - 1, y, pal.dark);
    if (pal.rim2 && tw >= 4) p.px(lx + 1, y, (y & 1) === 0 ? pal.rim2 : pal.body);
  }
  // limbs: alternate sides, shorter towards the top; thick trees get 2px limbs with one fork
  const n = limbs < 0 ? 3 + (seed % 2) : limbs;
  const thick = w >= 6;
  for (let k = 0; k < n; k++) {
    const y = top + Math.round(h * (0.1 + k * 0.16));
    const side = (k + seed) % 2 === 0 ? -1 : 1;
    const len = Math.round(w * (thick ? 1.3 : 2.2) + (n - k) * 2);
    const ox = x + side * Math.floor(w * (0.2 + 0.25 * (y - top) / h));
    limb(p, ox, y, side * len, -Math.round(len * 0.8), pal.body, thick ? 1 : 2);
    if (thick) {
      limb(p, ox, y + 1, side * len, -Math.round(len * 0.8), pal.body, 0);
      p.line(ox, y + 1, ox + side * len, y - Math.round(len * 0.8) + 1, side < 0 ? pal.rim : pal.body);
    }
  }
  // the broken top
  p.line(x, top, x + (seed % 3) - 1, top - 4, pal.body);
  // glowing split
  if (pal.crack && pal.hot) {
    let cx = x;
    for (let y = base - 2; y > base - h * 0.55; y--) {
      if (y % 4 === 0) cx += (y + seed) % 8 === 0 ? 1 : -1 * ((y + seed) % 3 === 0 ? 1 : 0);
      p.px(cx, y, (y + seed) % 7 < 2 ? pal.hot : pal.crack);
    }
  }
};

const paintBackTrees = (p: PixelPainter): void => {
  // a low burnt bank the trees stand on
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(110 + 2 * wave(x, 4, 0.3) + wave(x, 11, 1.7));
    p.vline(x, t, 120 - t, BACK_TREE.body);
    p.px(x, t, BACK_TREE.rim);
  }
  const SPOTS: [number, number, number][] = [
    [14, 34, 2], [38, 28, 2], [72, 40, 3], [96, 26, 2], [134, 36, 2], [170, 30, 2], [196, 42, 3], [232, 28, 2], [262, 38, 2], [298, 32, 2],
  ];
  SPOTS.forEach(([x, h, w], i) => deadTree(p, x, 114 + (i % 3), h, w, BACK_TREE, i));
};

const paintMidTrees = (p: PixelPainter): void => {
  const SPOTS: [number, number, number, number][] = [
    [26, 84, 9, 0], [112, 66, 7, 1], [186, 92, 10, 2], [250, 60, 6, 3]
  ];
  // charred mounds at the roots
  for (const [x, , w] of SPOTS) {
    p.ellipse(x, 123, w + 7, 3, TREE.body);
    p.hline(x - w - 5, 120, 4, TREE.rim2);
  }
  for (const [x, h, w, s] of SPOTS) deadTree(p, x, 123, h, w, TREE, s);
};

// ---------------------------------------------------------------- scorched floor

/** The ash drift the fighters stand on: wavy far and near edges around the floor line. */
const ashTop = (x: number): number => 133 + 1.5 * wave(x, 3, 0.5) + 1.2 * wave(x, 7, 2.2);
const ashBot = (x: number): number => 149 + 2 * wave(x, 2, 1.4) + 1.2 * wave(x, 5, 0.1);

/** A fallen charred limb: a dark log with a lit top edge and glowing ember rings. */
const LOGS: string[][] = [
  ["..llllllllll....", ".ldddedddddhdd..", "oddddddddddddddo", ".oooooooooooooo."],
  ["..lllllll", ".lddhddddo", "odddddeddo", ".ooooooo."],
];

const paintGround = (p: PixelPainter): void => {
  strata(p, GSTOPS, p.h, 3);
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(111 - 0.8 * wave(x, 9, 0.7) - 0.6 * wave(x, 21, 2));
    p.vline(x, e, 113 - e, GSTOPS[0][1]);
    p.px(x, e, "#7a3a28");
  }
  // furrows of scorched earth: short dark streaks, longer near the front
  p.reseed(311);
  for (let y = 116; y < p.h; y += 2 + Math.floor((y - 112) / 12)) {
    const depth = (y - 112) / 68;
    const bi = bandIndex(GSTOPS, y);
    const dark = GSTOPS[Math.min(GSTOPS.length - 1, bi + 2)][1];
    for (let k = 0; k < 10 + depth * 6; k++) {
      const x = Math.floor(p.rand() * TILE_W);
      p.hline(x, y, 2 + Math.round(depth * 7), dark);
    }
  }
  // the grey ash drift: lit far lip, darker near edge with a dark rim
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(ashTop(x));
    const b = Math.round(ashBot(x));
    // wind-blown ash thinning out over the earth on both sides of the drift
    p.dither(x, t - 4, 1, 3, ASH.shade, 3);
    p.dither(x, b + 1, 1, 3, ASH.shade, 4);
    p.vline(x, t, b - t, ASH.base);
    p.px(x, t - 1, ASH.edge);
    p.px(x, t, ASH.lit);
    p.px(x, b - 1, ASH.shade);
    p.px(x, b, ASH.edge);
  }
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(ashTop(x)), b = Math.round(ashBot(x));
    // soft ripples in the ash
    for (const f of [0.35, 0.68]) {
      if (wave(x, 13, f * 7) + 0.5 * wave(x, 31, f) > 0.2) continue;
      p.px(x, Math.round(t + (b - t) * f), ASH.shade);
      p.px(x, Math.round(t + (b - t) * f) + 1, ASH.lit);
    }
  }
  const onAsh = (x: number, y: number): boolean => y >= ashTop(x) - 2 && y <= ashBot(x) + 2;
  // ember litter glowing in the earth, plenty off the ash, a few on it
  embers(p, 913, 26, 116, 178, (x, y) => !onAsh(x, y));
  embers(p, 77, 10, 134, 150, (x, y) => onAsh(x, y) && y > ashTop(x) + 2 && y < ashBot(x) - 2);
  // fallen limbs
  const PAL = { o: LOG.o, d: LOG.d, l: LOG.l, e: LOG.e, h: LOG.h };
  const SPOTS: [number, number, number][] = [[40, 124, 1], [140, 120, 1], [232, 158, 0], [70, 166, 1], [296, 128, 0], [178, 172, 0]];
  for (const [x, y, k] of SPOTS) p.stamp(LOGS[k], x, y, PAL);
};

// ---------------------------------------------------------------- foreground
const paintFront = (p: PixelPainter): void => {
  const STUMPS: [number, number, number][] = [[8, 26, 12], [276, 17, 9]];
  for (const [x, h, w] of STUMPS) {
    // a broken charred stump: flared foot, jagged splintered top, red rim on the left
    for (let i = -2; i < w + 2; i++) {
      const inner = i >= 0 && i < w;
      const splinter = i === w - 1 ? 3 : 0;
      const flare = i < 0 ? -i : i - w + 1;
      let top = p.h - 4 + flare;
      if (inner) top = p.h - h + ((i * 7) % 5) + splinter;
      p.vline(x + i, top, p.h - top, TREE.dark);
      if (i === 0) p.vline(x + i, top + 1, p.h - top - 1, "#3a160e");
      if (i === 1) p.vline(x + i, top + 2, p.h - top - 2, "#1e0e0a");
    }
    p.px(x + Math.floor(w / 2), p.h - h + 6, LAVA.ember);
    p.px(x + Math.floor(w / 2), p.h - h + 7, LAVA.deep);
  }
  for (let x = 0; x < TILE_W; x++) {
    const h = Math.round(2 + wave(x, 7, 0.4) + wave(x, 19, 1.1));
    if (h > 0) p.vline(x, p.h - h, h, TREE.dark);
  }
};

const field: Battlefield = {
  terrain: "forest",
  ambient: "ash",
  ambientColors: ASH_COLORS,
  layers: [
    { parallax: 0.05, paint: paintSkyLayer },
    { parallax: 0.08, drift: 2.5, paint: paintSmokeLayer },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.4, paint: paintBackTrees },
    { parallax: 0.65, paint: paintMidTrees },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
