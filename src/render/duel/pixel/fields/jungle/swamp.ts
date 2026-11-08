import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import { mix } from "../../palette";
import { bandAt, canopy, crownCluster, crownRow, hazeStreaks, hills, jungleSky, lily, reedClump, strata, tuftField, vines, type Crown } from "./common";

/**
 * Jungle "Sunken Realm": a lily-choked backwater. A low gold sun in a steamy sky, misty hills
 * and canopy, mangroves on arching stilt roots hung with vines over still water, and a mossy
 * bank between two pools crowded with lily pads and white flowers.
 */

// ---------------------------------------------------------------- palettes
const HAZE = { hi: "#e8dc98", lo: "#c8c47e" };
const FAR_HILL = { fill: "#8ea46a", rim: "#a6b478" };
const FAR = { rim: "#8aa468", lit: "#7c9a62", mid: "#70905c", shade: "#668656", fill: "#628052" };
const FAR_MIST = "#9cb07a";
const MANG = { rim: "#5a9a4a", lit: "#4a8a40", mid: "#3a7436", shade: "#2e602e", fill: "#2a5a2a" };
const ROOT = { d: "#2a2a18", m: "#3a3a22", l: "#4e4a2c" };
const VINE = { stem: "#2a4a22", leaf: "#4a8a3a" };
const WATER = { top: "#5e8c62", base: "#3e7060", deep: "#2c5a4c", streak: "#6e9e78", glint: "#e8dc90", refl: "#1e4438" };
const BANK: [number, string][] = [
  [120, "#6e9046"],
  [129, "#668a42"],
  [135, "#5e823e"],
  [142, "#56783a"],
  [149, "#4c6e36"],
];
const BANK_EDGE = { lip: "#7ea052", mud: "#3e4a26", wet: "#2e3e22" };
const TONE = { tip: "#b8e080", blade: "#8ac060", dark: "#1e3a18" };
const PAD = { pad: "#4a9a3a", lit: "#6ab850", dark: "#2e6a28" };
const FAR_PAD = { pad: "#56985a", lit: "#6aa868", dark: "#3e7a44" };
const REED = { light: "#5a9a3a", dark: "#3a7a2a", head: "#6a4a2a" };
const FRONT = { light: "#1e4418", dark: "#12301a", head: "#2e2414" };

// ---------------------------------------------------------------- layers

const paintSky = (p: PixelPainter): void => jungleSky(p, { sunX: 250, sunY: 92, horizon: 104, to: 12, stars: 16 });

const paintHaze = (p: PixelPainter): void => {
  hazeStreaks(
    p,
    [
      [30, 66, 80],
      [170, 58, 60],
      [250, 74, 52],
      [96, 48, 44],
    ],
    HAZE.hi,
    HAZE.lo,
  );
};

/** Far: misty hills and a pale canopy line sinking into the steam over the water. */
const paintFar = (p: PixelPainter): void => {
  hills(p, (x) => 86 - 5 * wave(x, 2, 2.2) - 2 * wave(x, 6, 0.4), FAR_HILL.fill, FAR_HILL.rim);
  canopy(p, crownRow(p, 808, 98, 14, 5, 9, 6), FAR, p.h);
  p.ridge((x) => 104 - 1.5 * wave(x, 5, 1.1) - wave(x, 12, 0.3), FAR_MIST);
};

interface Mangrove {
  x: number;
  h: number;
  spread: number;
}
const MANGROVES: Mangrove[] = [
  { x: 36, h: 58, spread: 20 },
  { x: 140, h: 46, spread: 15 },
  { x: 236, h: 64, spread: 22 },
];
const WATERLINE = 112;

/** A mangrove: a short trunk on a fan of arching stilt roots, a lumpy crown and hanging vines. */
const mangrove = (p: PixelPainter, m: Mangrove, seed: number): void => {
  const fork = WATERLINE - 14;
  const top = WATERLINE - m.h;
  // stilt roots: arcs from the fork out to the water
  for (let k = -3; k <= 3; k++) {
    const reach = (k / 3) * m.spread;
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = Math.round(m.x + reach * t);
      const y = Math.round(fork + (WATERLINE - fork) * t - 4 * Math.sin(Math.PI * t) * Math.abs(k / 3));
      p.px(x, y, k < 0 ? ROOT.l : ROOT.m);
      p.px(x + 1, y, ROOT.d);
    }
  }
  // trunk
  for (let y = top + 6; y <= fork; y++) {
    p.px(m.x - 1, y, ROOT.l);
    p.px(m.x, y, ROOT.m);
    p.px(m.x + 1, y, ROOT.m);
    p.px(m.x + 2, y, ROOT.d);
  }
  p.reseed(seed);
  const crowns: Crown[] = [];
  for (let i = 0; i < 12; i++) {
    const dx = Math.round((p.rand() - 0.5) * m.spread * 2.2);
    crowns.push({ x: m.x + dx, y: top + Math.round(p.rand() * 6) + Math.round(Math.abs(dx) * 0.25), r: 6 + Math.round(p.rand() * 4) });
  }
  crownCluster(p, crowns, MANG);
  const list: [number, number, number][] = [];
  for (let i = 0; i < 4; i++) list.push([m.x - m.spread + Math.round(((i + 0.5) / 4) * m.spread * 2), top + 8, 10 + Math.round(p.rand() * 14)]);
  vines(p, list, VINE.stem, VINE.leaf);
};

/** Mid: still water at the foot of the mangroves, and reed beds. */
const paintMid = (p: PixelPainter): void => {
  p.rect(0, WATERLINE - 2, TILE_W, p.h - WATERLINE + 2, WATER.top);
  MANGROVES.forEach((m, i) => mangrove(p, m, 40 + i * 17));
  for (const x of [8, 96, 120, 196, 290]) reedClump(p, x, WATERLINE + 1, 14, REED.light, REED.dark, REED.head);
};

// ---------------------------------------------------------------- ground

const bankTop = (x: number): number => 128 + 1.5 * wave(x, 3, 0.8) + wave(x, 7, 2.1);
const bankBottom = (x: number): number => 154 + 2 * wave(x, 2, 1.7) + wave(x, 6, 0.2);

/** Back pool, bank and near pool; lily pads crowd both pools. */
const paintGround = (p: PixelPainter): void => {
  strata(
    p,
    [
      [112, WATER.top],
      [115, WATER.base],
      [120, WATER.deep],
    ],
    p.h,
    2,
  );
  // the bank
  strata(p, BANK, p.h, 3);
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(bankTop(x));
    const b = Math.round(bankBottom(x));
    p.vline(x, 120, t - 120, WATER.deep);
    p.px(x, t - 2, WATER.refl);
    p.px(x, t, BANK_EDGE.lip);
    p.px(x, t - 1, BANK_EDGE.wet);
    p.vline(x, b, 2, BANK_EDGE.mud);
    p.vline(x, b + 2, p.h - b - 2, WATER.deep);
    p.px(x, b + 2, WATER.refl);
  }
  // flat streaks of light on the water
  p.reseed(83);
  for (let k = 0; k < 34; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 113 + Math.floor(p.rand() * 7) * 2;
    if (y < bankTop(x) - 2 && y < bankTop(x + 8) - 2) p.hline(x, y, 3 + Math.floor(p.rand() * 6), y < 116 ? WATER.glint : WATER.streak);
  }
  // near water: lighter rows going down
  for (let x = 0; x < TILE_W; x++) {
    const b = Math.round(bankBottom(x)) + 4;
    for (let y = b; y < p.h; y++) if ((y - b) % 7 === 3 && (x * 3 + y) % 17 < 8) p.px(x, y, WATER.base);
  }
  // mossy hummocks and tufts on the bank
  const onBank = (x: number, y: number): boolean => y > bankTop(x) + 2 && y < bankBottom(x) - 1;
  for (const [cx, cy, rx, ry] of [
    [60, 132, 26, 2],
    [210, 146, 34, 3],
    [300, 136, 18, 2],
  ] as [number, number, number, number][])
    p.ellipse(cx, cy, rx, ry, mix(bandAt(BANK, cy), TONE.blade, 0.25));
  tuftField(p, 616, 128, 0.45, (y) => bandAt(BANK, y), TONE, onBank);
  // lily pads: small and flat on the back pool, bigger in the near pool
  p.reseed(4747);
  for (let k = 0; k < 22; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 115 + Math.floor(p.rand() * 10);
    if (y > bankTop(x) - 3) continue;
    lily(p, x, y, 3 + Math.floor(p.rand() * 2), FAR_PAD.pad, FAR_PAD.lit, FAR_PAD.dark, p.rand() > 0.75 ? "#e8f0e0" : null);
  }
  for (let k = 0; k < 18; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 160 + Math.floor(p.rand() * 18);
    if (y < bankBottom(x) + 6) continue;
    lily(p, x, y, 5 + Math.floor(p.rand() * 4), PAD.pad, PAD.lit, PAD.dark, p.rand() > 0.55 ? "#ffffff" : null);
  }
  for (const x of [26, 170, 276]) reedClump(p, x, Math.round(bankTop(x)) + 2, 12, REED.light, REED.dark, REED.head);
};

/** Front: dark reed clumps rising from the near water. */
const paintFront = (p: PixelPainter): void => {
  for (const [x, h] of [
    [6, 34],
    [16, 26],
    [124, 18],
    [204, 22],
    [298, 24],
    [306, 30],
  ] as [number, number][])
    reedClump(p, x, p.h - 1, h, FRONT.light, FRONT.dark, FRONT.head);
};

const field: Battlefield = {
  terrain: "swamp",
  ambient: "fireflies",
  ambientColors: ["#e8f0a0", "#b8e080", "#fff8d0"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.08, drift: 2, paint: paintHaze },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.5, paint: paintMid },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
