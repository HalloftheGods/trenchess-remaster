import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Palette } from "../../palette";
import { NIGHT, boulder, glints, paintAurora, paintNight, paintPeaks, plant, snowBank, strata, type Peak } from "./common";

/**
 * Tundra "Iron Peaks": a high icy pass. Great glacier-capped peaks under a thin aurora, a
 * nearer range of steel-blue rock, snowy crags flanking the pass, and a wind-scoured ledge of
 * frozen rock with cracks, scree and snow-capped boulders for the fighters to stand on.
 */

// ---------------------------------------------------------------- palettes
const SKY = NIGHT.slice(0, 12);
const FAR_PEAK = { lit: "#c8d8e8", shade: "#8aa0b8", snow: "#eef4fa", snowShade: "#b8cade", rim: "#ffffff" };
const BACK_PEAK = { lit: "#7a8ea4", shade: "#56687c", snow: "#d8e4f0", snowShade: "#a4b6ca", rim: "#8ea2b8" };
const CRAG_PEAK = { lit: "#6e8298", shade: "#4c5e72", snow: "#e8f0f8", snowShade: "#9cb0c4", rim: "#8ea2b8" };
const MIST = "#9ab4cc";
const LEDGE = { rim: "#dce8f2", body: "#8ea2b8", shade: "#6a7c90" };
const GROUND: [number, string][] = [
  [116, "#8ea2b8"],
  [120, "#9aaec2"],
  [125, "#a6b8cc"],
  [131, "#b0c2d4"],
  [139, "#b8c8d8"],
  [150, "#c4d4e4"],
  [162, "#b4c4d6"],
  [172, "#a2b4c8"],
];
const CRACK = { line: "#56687c", lit: "#dce8f4" };
const SCREE = ["#6a7c90", "#8a9cb0", "#e8f2fc"];
const ROCK: Palette = { o: "#3e4e60", d: "#6a7c90", m: "#8a9cb0", l: "#a8bacc", s: "#f4f8fc", S: "#c4d4e2" };
const FRONT_ROCK: Palette = { o: "#1e2834", d: "#2e3a48", m: "#3e4c5c", l: "#52627a", s: "#e8f0f6", S: "#a8b8c8" };

const FAR: Peak[] = [
  { x: 40, y: 34, s: 0.62, snow: 26 },
  { x: 120, y: 50, s: 0.7, snow: 18 },
  { x: 200, y: 26, s: 0.58, snow: 30 },
  { x: 282, y: 44, s: 0.66, snow: 22 },
];
const BACK: Peak[] = [
  { x: 10, y: 70, s: 0.9, snow: 8 },
  { x: 86, y: 76, s: 1, snow: 7 },
  { x: 160, y: 66, s: 0.85, snow: 10 },
  { x: 236, y: 78, s: 1.05, snow: 6 },
  { x: 306, y: 74, s: 0.95, snow: 8 },
];
const CRAGS: Peak[] = [
  { x: 4, y: 62, s: 1.35, snow: 14, ledge: 12 },
  { x: 34, y: 80, s: 1.6, snow: 10, ledge: 11 },
  { x: 268, y: 68, s: 1.4, snow: 13, ledge: 12 },
  { x: 240, y: 86, s: 1.7, snow: 9, ledge: 11 },
];

// ---------------------------------------------------------------- layers

const paintSky = (p: PixelPainter): void => {
  paintNight(p, SKY, 92, 9001, 70);
  paintAurora(p, [{ cx: 130, half: 140, y: 26, amp: 6, n: 3, phase: 1.8, len: 20 }]);
};

/** Far: the great glacier peaks, lit from the right. */
const paintFar = (p: PixelPainter): void => {
  paintPeaks(p, FAR, FAR_PEAK, 112);
};

/** Back: the nearer steel-blue range sinking into a band of valley mist. */
const paintBack = (p: PixelPainter): void => {
  paintPeaks(p, BACK, BACK_PEAK, 112);
  p.ridge((x) => 103 + 2 * wave(x, 4, 0.8) + wave(x, 9, 2.2), MIST, 112);
};

/** Mid: dark snowy crags flanking the pass and the far rim of the ledge. */
const paintMid = (p: PixelPainter): void => {
  paintPeaks(p, CRAGS, CRAG_PEAK, 118);
  snowBank(p, (x) => 112 + 1.5 * wave(x, 5, 0.4) + wave(x, 11, 1.7), LEDGE, 118);
};

/** A crack across the rock: a jagged dark run with a lit lip below it. */
const crack = (p: PixelPainter, x: number, y: number, len: number, seed: number): void => {
  p.reseed(seed);
  let [cx, cy] = [x, y];
  for (let k = 0; k < len; ) {
    const seg = 2 + Math.round(p.rand() * 5);
    const nx = cx + seg;
    const ny = cy + Math.round((p.rand() - 0.5) * seg * 0.8);
    p.line(cx, cy + 1, nx, ny + 1, CRACK.lit);
    p.line(cx, cy, nx, ny, CRACK.line);
    [cx, cy] = [nx, ny];
    k += seg;
  }
};

/** Ground: frozen rock strata, cracks, scree, snow pockets and boulders. */
const paintGround = (p: PixelPainter): void => {
  strata(p, GROUND, p.h, 3);
  // flat rock slabs: a lit top edge and a shaded step under each
  for (const [x, y, w] of [
    [30, 124, 40],
    [190, 122, 50],
    [110, 132, 60],
    [260, 136, 44],
    [0, 154, 70],
    [150, 160, 90],
  ] as [number, number, number][]) {
    p.hline(x, y, w, "#cad8e6");
    p.hline(x + 2, y + 1, w - 4, GROUND[GROUND.length - 3][1]);
    p.hline(x + 3, y + 3 + Math.floor((y - 116) / 16), w - 2, CRACK.line);
  }
  for (const [x, y, len, seed] of [
    [80, 128, 30, 3],
    [220, 129, 26, 5],
    [40, 142, 36, 7],
    [270, 148, 30, 9],
    [100, 170, 50, 11],
  ] as [number, number, number, number][])
    crack(p, x, y, len, seed);
  // snow pockets in the hollows
  for (const [cx, cy, rx, ry] of [
    [150, 119, 16, 1],
    [6, 130, 18, 2],
    [220, 152, 26, 3],
    [70, 174, 30, 3],
  ] as [number, number, number, number][]) {
    p.ellipse(cx, cy + 1, rx + 1, ry, "#a8bccc");
    p.ellipse(cx, cy, rx, ry, "#e8f0f6");
    p.hline(cx - Math.round(rx * 0.5), cy - ry, Math.round(rx), "#ffffff");
  }
  // scree: small stones, more and bigger near
  p.reseed(2718);
  for (let i = 0; i < 110; i++) {
    const y = Math.floor(118 + p.rand() * p.rand() * 60);
    const x = Math.floor(p.rand() * TILE_W);
    if (y > 135 && y < 146) continue;
    const c = SCREE[Math.floor(p.rand() * 2)];
    p.px(x, y, c);
    if (y > 150) {
      p.px(x + 1, y, c);
      p.px(x, y - 1, SCREE[2]);
    }
  }
  for (const [x, y, rx, ry] of [
    [98, 124, 5, 4],
    [244, 127, 7, 5],
    [16, 140, 8, 6],
    [178, 132, 4, 3],
  ] as [number, number, number, number][])
    plant(p, boulder(rx, ry, true), x, y, ROCK);
  glints(p, 118, 178, 30, "#ffffff", 404);
};

/** Front: dark snow-capped boulders at the bottom corners. */
const paintFront = (p: PixelPainter): void => {
  for (const [x, y, rx, ry] of [
    [14, 186, 22, 14],
    [44, 188, 12, 8],
    [196, 188, 14, 9],
    [296, 186, 18, 12],
  ] as [number, number, number, number][])
    plant(p, boulder(rx, ry, true), x, y, FRONT_ROCK);
};

const field: Battlefield = {
  terrain: "mountain",
  ambient: "snow",
  ambientColors: ["#ffffff", "#dce8f4", "#b8cade"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.12, paint: paintFar },
    { parallax: 0.25, paint: paintBack },
    { parallax: 0.55, paint: paintMid },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
