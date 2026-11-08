import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Palette } from "../../palette";
import type { Grid } from "../../sheet";
import { NIGHT, boulder, glints, paintAurora, paintNight, paintPeaks, plant, snowBank, strata, striae, type AuroraPal, type Peak } from "./common";

/**
 * Tundra "Endless Sands": wind-scoured gravel barrens. A pale moon and a faint aurora over flat
 * snow-streaked tablelands, low grey scree ridges dotted with boulders and a stone cairn, and a
 * floor of grey gravel combed into streaks by the wind, with snow caught in the lee of stones.
 */

// ---------------------------------------------------------------- palettes
const SKY = [...NIGHT.slice(0, 10), "#7c9ab4", "#9cb4c8", "#b8c8d6"];
const FAINT: AuroraPal = { edge: "#9ee8c8", core: "#4ac898", mid: "#2e8a78", tail: "#245a6e" };
const MOON = { halo: "#2e4a6a", ring: "#5a7896", body: "#e8f0f8", shade: "#c4d2e0", crater: "#aebccc" };
const TABLE = { flat: "#7c8a9a", lit: "#94a2b2", shade: "#64728a", snow: "#dce6ee", snowShade: "#a8b6c4", haze: "#9cb0c2" };
const RANGE_PAL = { lit: "#7e98b2", shade: "#62809e", snow: "#b4c8da", snowShade: "#94aec6", rim: "#c8d8e6" };
const RANGE: Peak[] = [
  { x: 30, y: 66, s: 0.5, snow: 12 },
  { x: 118, y: 74, s: 0.6, snow: 9 },
  { x: 176, y: 62, s: 0.45, snow: 14 },
  { x: 262, y: 70, s: 0.55, snow: 10 },
];
const SCREE_FAR = { rim: "#a4aab0", body: "#7a8088", shade: "#646a72" };
const SCREE_NEAR = { rim: "#a8aeb4", body: "#80868e", shade: "#686e76" };
const ROCK: Palette = { o: "#3a4048", d: "#565c62", m: "#6a7076", l: "#8a9096", s: "#e8eef4", S: "#b8c4ce" };
const CAIRN: Palette = { o: "#2e343a", d: "#4a5056", m: "#62686e", l: "#7e848a", s: "#e8eef4" };
const GROUND: [number, string][] = [
  [116, "#6a7076"],
  [120, "#72787e"],
  [125, "#7a8086"],
  [131, "#82888e"],
  [139, "#8a9096"],
  [150, "#91979d"],
  [162, "#888e94"],
  [172, "#7c8288"],
];
const PEBBLES = ["#5a6066", "#6a7076", "#a8aeb4", "#b8bec4"];
const FRONT_ROCK: Palette = { o: "#1c2026", d: "#2a3036", m: "#3a4046", l: "#4e545a", s: "#d8e0e8", S: "#9aa6b2" };
const FRONT_BANK = { rim: "#6a7076", body: "#4a5056", shade: "#3a4046" };

// ---------------------------------------------------------------- layers

const paintSky = (p: PixelPainter): void => {
  paintNight(p, SKY, 104, 3301, 60);
  paintAurora(p, [{ cx: 90, half: 100, y: 30, amp: 5, n: 2, phase: 0.4, len: 18 }], FAINT);
  const [mx, my] = [236, 34];
  p.disc(mx, my, 11, MOON.halo);
  p.disc(mx, my, 9, MOON.ring);
  p.disc(mx, my, 7, MOON.body);
  // the shaded limb on the left and a few craters
  for (let y = -7; y <= 7; y++) {
    const half = Math.floor(7 * Math.sqrt(1 - (y * y) / 49) + 0.35);
    p.hline(mx - half, my + y, Math.max(1, Math.round(half * 0.5)), MOON.shade);
  }
  for (const [cx, cy] of [
    [2, -2],
    [-1, 3],
    [3, 3],
  ] as [number, number][]) {
    p.px(mx + cx, my + cy, MOON.crater);
    p.px(mx + cx + 1, my + cy, MOON.crater);
  }
};

/** Height of the tablelands: flat tops broken by short steep scarps. */
const tableTop = (x: number): number => {
  const t = wave(x, 2, 0.6) + 0.6 * wave(x, 5, 1.9) + 0.25 * wave(x, 11, 0.2);
  const step = Math.max(0, Math.min(1, t * 1.6 + 0.4));
  const level = step > 0.66 ? 1 : 0;
  const mid = step > 0.33 ? 0.5 : 0;
  return 98 - 12 * Math.max(level, mid);
};

/** Tableland tops per column, with talus slopes of at most 2px per column at the scarps. */
const tableTops = (): number[] => {
  const tops: number[] = [];
  for (let x = 0; x < TILE_W; x++) tops.push(tableTop(x));
  for (let pass = 0; pass < 2; pass++) {
    for (let x = 0; x < TILE_W * 2; x++) {
      const i = x % TILE_W;
      tops[i] = Math.min(tops[i], tops[(i + TILE_W - 1) % TILE_W] + 2);
    }
    for (let x = TILE_W * 2; x > 0; x--) {
      const i = x % TILE_W;
      tops[i] = Math.min(tops[i], tops[(i + 1) % TILE_W] + 2);
    }
  }
  return tops;
};

/** Far: flat snow-capped tablelands, lit on their right-facing talus, sinking into haze. */
const paintFar = (p: PixelPainter): void => {
  paintPeaks(p, RANGE, RANGE_PAL, 100);
  const tops = tableTops();
  for (let x = 0; x < TILE_W; x++) {
    const top = tops[x];
    const left = tops[(x + TILE_W - 1) % TILE_W];
    const right = tops[(x + 1) % TILE_W];
    let face = TABLE.flat;
    if (right > top || left < top) face = TABLE.lit;
    if (left > top && right <= top) face = TABLE.shade;
    for (let y = top; y < 108; y++) {
      const dy = y - top;
      let c = face;
      if (dy === 0) c = face === TABLE.shade ? TABLE.snowShade : TABLE.snow;
      else if (dy === 1 && face === TABLE.flat) c = TABLE.snowShade;
      // horizontal strata across the cliff band
      if (dy > 2 && (y + 1) % 5 === 0 && face !== TABLE.flat) c = TABLE.shade;
      if (face === TABLE.flat && (dy === 4 || dy === 8) && wave(x, 13, dy) > 0.35) c = TABLE.snowShade;
      p.px(x, y, c);
    }
  }
  p.ridge((x) => 101 + 1.5 * wave(x, 4, 0.5) + wave(x, 9, 1.2), TABLE.haze, 110);
};

/** A stone cairn: stacked flat slabs, a little snow on each ledge. */
const CAIRN_GRID: Grid = [
  "....sss....",
  "...lmmmd...",
  "..sssss....",
  ".lmmmmmmd..",
  "...lmmmd...",
  "...lmmd....",
  "ssssssssss.",
  "lmmmmmmmmdd",
  "..lmd.lmd..",
  "..lmd.lmd..",
  "..lmd.lmd..",
  ".olmdolmdo.",
];

/** Back: low grey scree ridges with boulders and a lone cairn on the skyline. */
const paintBack = (p: PixelPainter): void => {
  const far = (x: number): number => 106 + 3 * wave(x, 3, 1.4) + wave(x, 7, 0.3);
  snowBank(p, far, SCREE_FAR, 118);
  plant(p, CAIRN_GRID, 70, Math.round(far(70)) + 2, CAIRN);
  for (const [x, rx, ry] of [
    [140, 4, 3],
    [212, 6, 4],
    [292, 3, 2],
  ] as [number, number, number][])
    plant(p, boulder(rx, ry, true), x, Math.round(far(x)) + 2, ROCK);
  snowBank(p, (x) => 112 + 2 * wave(x, 2, 2.6) + wave(x, 6, 0.9), SCREE_NEAR, 118);
};

/** Ground: grey gravel strata, wind streaks, pebbles, stones with snow in their lee. */
const paintGround = (p: PixelPainter): void => {
  strata(p, GROUND, p.h, 3);
  striae(p, 118, 178, (y) => (y < 134 ? "#7e848a" : "#9ca2a8"), 6061);
  // pebbles: specks far, 2px stones near with a lit top
  p.reseed(1234);
  for (let i = 0; i < 200; i++) {
    const y = Math.floor(117 + p.rand() * p.rand() * 62);
    const x = Math.floor(p.rand() * TILE_W);
    const c = PEBBLES[Math.floor(p.rand() * 2)];
    p.px(x, y, c);
    if (y > 146) {
      p.px(x + 1, y, c);
      p.px(x, y - 1, PEBBLES[2 + Math.floor(p.rand() * 2)]);
    }
  }
  // stones with a snow drift in their lee (to their left, the wind blows from the right)
  for (const [x, y, rx, ry] of [
    [104, 125, 4, 3],
    [196, 122, 3, 2],
    [262, 131, 6, 4],
    [20, 136, 5, 4],
    [150, 158, 8, 5],
    [300, 164, 6, 4],
  ] as [number, number, number, number][]) {
    const tail = rx * 3 + 4;
    p.hline(x - rx - tail, y, tail + 2, "#a8b4c0");
    p.hline(x - rx - tail + 2, y - 1, tail, "#d4dde6");
    p.hline(x - rx - Math.round(tail * 0.6), y - 2, Math.round(tail * 0.6) + 1, "#eef4f8");
    plant(p, boulder(rx, ry, false), x, y, ROCK);
  }
  glints(p, 118, 178, 24, "#c8ced4", 909);
};

/** Front: a dark gravel bank with snow-dusted boulders along the bottom edge. */
const paintFront = (p: PixelPainter): void => {
  snowBank(p, (x) => 175 + 2 * wave(x, 3, 0.6) + wave(x, 8, 2.1), FRONT_BANK);
  for (const [x, y, rx, ry] of [
    [12, 186, 18, 12],
    [40, 186, 9, 7],
    [184, 186, 12, 8],
    [292, 186, 16, 11],
  ] as [number, number, number, number][])
    plant(p, boulder(rx, ry, true), x, y, FRONT_ROCK);
};

const field: Battlefield = {
  terrain: "desert",
  ambient: "sand",
  ambientColors: ["#b8bec4", "#d0d8e0", "#9aa0a6"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.15, paint: paintFar },
    { parallax: 0.35, paint: paintBack },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
