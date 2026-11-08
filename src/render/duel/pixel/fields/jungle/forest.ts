import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { mix, type Palette } from "../../palette";
import { bandAt, canopy, crownRow, frondClump, jungleSky, strata, tuftField, vines, wdx, type Crown } from "./common";

/**
 * Jungle "Whispering Woods": the deep rainforest. A gold glow far behind rows of misty round
 * crowns, slanting shafts of light, huge buttressed trunks wound with lianas, a dense
 * vine-hung canopy overhead and a dark leafy floor with ferns.
 */

// ---------------------------------------------------------------- palettes
const FAR = { rim: "#b0bc84", lit: "#a0b07a", mid: "#92a472", shade: "#86986a", fill: "#829466" };
const FAR_MIST = "#b4c088";
const BACK = { rim: "#76a05a", lit: "#64904e", mid: "#568246", shade: "#4a743e", fill: "#446c3a" };
const BACK_TRUNK = { d: "#3e5c36", l: "#4e6c40" };
const BACK_MIST = "#7c9c5e";
const SHAFT = "rgba(255,240,160,0.13)";
const SHAFT_CORE = "rgba(255,248,200,0.10)";
const BARK = { o: "#1a1209", d: "#2a1e10", m: "#3a2a18", l: "#4a3a22", h: "#5e4a2c" };
const MOSS = { d: "#1e4a1c", m: "#285e26", l: "#32702e", h: "#468a36" };
const LEAF = { base: "#0e2c0e", lo: "#163e16", mid: "#205220", hi: "#2a6a28", tip: "#3a8a38" };
const LIANA = { stem: "#2a3a18", leaf: "#3a8a38" };
const GROUND: [number, string][] = [
  [112, "#4e8642"],
  [117, "#467e3c"],
  [122, "#3e7636"],
  [128, "#376e32"],
  [134, "#30662e"],
  [141, "#2a5e2a"],
  [151, "#245426"],
  [163, "#1e4a22"],
];
const DARK = "#0e2c0e";
const TONE = { tip: "#9ad868", blade: "#5aa83a", dark: DARK };
const DAPPLE = { lo: "#5c9644", hi: "#74ac52" };
const GTEX: Palette = {
  f: "#3a7a30",
  F: "#1e4e1c",
  p: "#8a7038",
  P: "#5e4a26",
  n: "#3a9a3c",
  N: "#2a7a30",
};
const FRONT = { body: "#0a200c", lit: "#1a4418" };

// ---------------------------------------------------------------- helpers

const shadeOf = (l: number): string => {
  if (l > 0.55) return LEAF.hi;
  if (l > 0.05) return LEAF.mid;
  if (l > -0.55) return LEAF.lo;
  return LEAF.base;
};

const barkTone = (u: number): string => {
  if (u < 0.14) return BARK.h;
  if (u < 0.4) return BARK.l;
  if (u < 0.74) return BARK.m;
  return BARK.d;
};

const mossTone = (mx: number, mw: number): string => {
  if (mx === mw) return MOSS.d;
  if (mx < Math.max(1, mw * 0.3)) return MOSS.h;
  if (mx < mw - 1) return MOSS.l;
  return MOSS.m;
};

// ---------------------------------------------------------------- layers

const paintSky = (p: PixelPainter): void => jungleSky(p, { sunX: 206, sunY: 78, horizon: 112, from: 2, to: 11, stars: 0 });

/** Far: rows of pale crowns melting into gold-green mist. */
const paintFar = (p: PixelPainter): void => {
  canopy(p, crownRow(p, 211, 84, 15, 7, 12, 10), FAR, p.h);
  p.ridge((x) => 100 - 2 * wave(x, 4, 1.3) - wave(x, 9, 0.2), FAR_MIST);
};

/** Back: thin trunks, a darker crown line, mist and slanting shafts of light. */
const paintBack = (p: PixelPainter): void => {
  p.reseed(977);
  for (let i = 0; i < 9; i++) {
    const x = Math.round(i * 35.5 + p.rand() * 12);
    const w = 2 + Math.round(p.rand() * 2);
    p.rect(x, 0, w, 110, BACK_TRUNK.d);
    p.vline(x, 0, 110, BACK_TRUNK.l);
  }
  const crowns = crownRow(p, 523, 98, 18, 6, 11, 8);
  canopy(p, crowns, BACK, 112, false);
  p.ridge((x) => 104 - 2 * wave(x, 5, 0.6) - wave(x, 11, 2), BACK_MIST, 112);
  const shafts: [number, number][] = [
    [160, 12],
    [186, 6],
    [40, 9],
    [266, 7],
  ];
  for (const [sx, sw] of shafts) {
    for (let y = 20; y < 118; y++) {
      const k = y < 82 ? 1 : Math.max(0, 1 - (y - 82) / 34);
      const w = Math.round(sw * k);
      if (w <= 0) continue;
      const x0 = Math.round(sx + y * 0.42) + Math.floor((sw - w) / 2);
      p.hline(x0, y, w, SHAFT);
      if (w > 7) p.hline(x0 + 2, y, w - 4, SHAFT_CORE);
    }
  }
};

interface Trunk {
  x: number;
  w: number;
  seed: number;
}
const TRUNKS: Trunk[] = [
  { x: 4, w: 24, seed: 1 },
  { x: 100, w: 13, seed: 2.3 },
  { x: 176, w: 19, seed: 4.1 },
  { x: 270, w: 11, seed: 5.7 },
];
const ROOT_Y = 113;

/** A buttressed rainforest trunk: cylinder shading, vertical bark grooves, a moss sheet, a winding liana. */
const trunk = (p: PixelPainter, t: Trunk): void => {
  const flare = 16;
  for (let y = 0; y < ROOT_Y; y++) {
    const k = y - (ROOT_Y - flare);
    const extra = k > 0 ? Math.round((k * k) / 12) : 0;
    const L = t.x - extra;
    const R = t.x + t.w + extra;
    const span = R - L;
    for (let x = L; x <= R; x++) {
      const u = (x - L) / span;
      let c = barkTone(u);
      if (x === L || x === R) c = BARK.o;
      else if ((x - t.x + Math.round(t.seed * 3)) % 6 === 0 && u > 0.12 && k < 2) c = mix(c, BARK.o, 0.5);
      // buttress folds: dark seams fanning out at the base
      if (k > 0 && (Math.abs(x - (t.x + t.w / 2)) % Math.max(5, Math.floor(span / 4))) === 0) c = BARK.d;
      const env = Math.min(1, (Math.sin(y * 0.07 + t.seed * 3) + 0.4) * 2.5, (y - 30) / 6);
      if (env > 0 && k < 0) {
        const mw = Math.round((t.w * 0.26 + 1.5 * Math.sin(y * 0.23 + t.seed)) * env);
        const mx = x - L;
        if (mx <= mw && mx > 0) c = mossTone(mx, mw);
      }
      p.px(x, y, c);
    }
  }
  // a liana spiralling round the trunk: only the front-facing half is drawn
  for (let y = 28; y < ROOT_Y - 4; y++) {
    const ph = y * 0.16 + t.seed * 2;
    if (Math.cos(ph) < 0) continue;
    const x = Math.round(t.x + t.w / 2 + (t.w / 2) * Math.sin(ph));
    p.px(x, y, LIANA.stem);
    p.px(x + 1, y, LIANA.stem);
    if (y % 7 === 0) p.px(x - 1, y - 1, LIANA.leaf);
  }
};

/** Canopy discs hanging along the top edge, each shaded against the top-left light. */
const canopyBlobs = (p: PixelPainter): Crown[] => {
  p.reseed(4242);
  const out: Crown[] = [];
  for (let x = 0; x < TILE_W; x += 9) {
    const base = 22 + Math.round(6 * wave(x, 3, 0.4) + 4 * wave(x, 5, 2.1));
    const r = 5 + Math.round(p.rand() * 4);
    out.push({ x: x + Math.round(p.rand() * 5), y: base - 3, r: r + 2 });
    out.push({ x: x + 4 + Math.round(p.rand() * 4), y: base + Math.round(p.rand() * 5), r });
  }
  return out;
};

const paintCanopy = (p: PixelPainter): void => {
  const blobs = canopyBlobs(p);
  for (let x = 0; x < TILE_W; x++) {
    p.vline(x, 0, 16 + Math.round(3 * wave(x, 3, 0.4)), LEAF.base);
    let low = 0;
    for (let y = 0; y < 48; y++) {
      let own: Crown | null = null;
      for (const b of blobs) {
        const dx = wdx(x, b.x);
        if (dx * dx + (y - b.y) ** 2 <= b.r * b.r + b.r * 0.6) own = b;
      }
      if (!own) continue;
      const l = -0.55 * (wdx(x, own.x) / own.r) - 0.83 * ((y - own.y) / own.r);
      p.px(x, y, shadeOf(l));
      low = y;
    }
    const tooth = [0, 1, 2, 0, 1, 0, 0, 1, 3, 1, 0, 0, 2, 1][(x * 5 + (x >> 3)) % 14];
    for (let k = 1; k <= tooth; k++) p.px(x, low + k, k === tooth && tooth > 1 ? LEAF.mid : LEAF.lo);
  }
  vines(
    p,
    [
      [52, 28, 40],
      [58, 30, 22],
      [140, 30, 30],
      [222, 30, 52],
      [229, 28, 26],
      [310, 30, 34],
      [86, 32, 16],
    ],
    LEAF.lo,
    LEAF.tip,
  );
};

/** Mid: the far floor strip, the great trunks and the canopy overhead. */
const paintMid = (p: PixelPainter): void => {
  p.ridge((x) => 108 + Math.round(1.5 * wave(x, 6, 1.2) + wave(x, 11)), GROUND[0][1]);
  for (const t of TRUNKS) p.ellipse(t.x + Math.round(t.w / 2), ROOT_Y - 1, t.w + 14, 2, mix(GROUND[0][1], DARK, 0.35));
  for (const t of TRUNKS) trunk(p, t);
  paintCanopy(p);
};

// ---------------------------------------------------------------- ground

const LITTER: Grid[] = [["fF"], ["pf.", ".fP"], [".pf.", "pffF", ".FP."]];
const FERN: Grid = [
  "....n.....n....",
  "..n.n..n..n.n..",
  ".nnNn.nNn.nNnn.",
  "n..Nn.nNn.nN..n",
  "...N..nNn..N...",
  "....N.NNN.N....",
  ".....NNNNN.....",
];

const paintGround = (p: PixelPainter): void => {
  strata(p, GROUND, p.h, 3);
  for (const [cx, cy, rx, ry] of [
    [20, 118, 24, 2],
    [190, 116, 18, 2],
    [60, 128, 34, 4],
    [250, 134, 40, 5],
    [150, 154, 54, 7],
    [10, 162, 40, 8],
  ] as [number, number, number, number][])
    for (let y = -ry; y <= ry; y++) {
      const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))) + 0.35);
      const lobe = Math.round(2 * wave(cx + y * 7, 3));
      p.hline(cx - half + lobe, cy + y, half * 2 + 1, mix(bandAt(GROUND, cy + y), DARK, 0.2));
    }
  // light pools where the shafts land
  for (const [cx, cy, rx, ry] of [
    [236, 119, 12, 1],
    [112, 132, 24, 3],
    [300, 146, 26, 4],
  ] as [number, number, number, number][]) {
    p.ellipse(cx, cy, rx, ry, DAPPLE.lo);
    p.ellipse(cx - 2, cy - Math.floor(ry / 3), Math.round(rx * 0.55), Math.max(0, ry - 2), DAPPLE.hi);
  }
  tuftField(p, 5150, 116, 0.5, (y) => bandAt(GROUND, y), TONE);
  p.reseed(313);
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 118 + Math.floor(p.rand() * 58);
    const size = Math.min(2, Math.floor((y - 114) / 20));
    p.stamp(LITTER[size], x, y, GTEX);
  }
  for (const [x, y] of [
    [8, 124],
    [160, 121],
    [244, 127],
    [76, 116],
  ] as [number, number][])
    p.stamp(FERN, x, y, GTEX);
};

/** Front: black-green fern clumps along the bottom edge. */
const paintFront = (p: PixelPainter): void => {
  for (const [cx, s] of [
    [24, 1],
    [128, 0.8],
    [214, 1],
    [296, 0.9],
  ] as [number, number][])
    frondClump(p, cx, s, FRONT.body, FRONT.lit);
  p.ridge((x) => 171 + Math.round(2 * wave(x, 4, 0.7) + wave(x, 9)), FRONT.body);
};

const field: Battlefield = {
  terrain: "forest",
  ambient: "fireflies",
  ambientColors: ["#fff0a0", "#d8f080", "#fffbe0"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.15, paint: paintFar },
    { parallax: 0.3, paint: paintBack },
    { parallax: 0.55, paint: paintMid },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
