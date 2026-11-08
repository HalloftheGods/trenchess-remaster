import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Palette } from "../../palette";
import { NIGHT, fir, firRow, glints, paintAurora, paintNight, plant, snowBank, strata } from "./common";

/**
 * Tundra "Whispering Woods": a snowbound fir forest at night. The aurora glows through a gap
 * above rows of snowy firs fading into frost mist, big snow-laden firs stand behind the
 * clearing, and the fighters meet on trampled snow strewn with needles and fallen snow clumps.
 */

// ---------------------------------------------------------------- palettes
const SKY = NIGHT.slice(0, 11);
const FAR: Palette = { s: "#b4c8d4", S: "#98b0c0", b: "#6e8c98", c: "#62808e", t: "#5a7484" };
const FAR_MIST = "#8eaabb";
const BACK: Palette = { s: "#d4e2ea", S: "#a8bccb", b: "#3e5e5a", c: "#34524f", t: "#2e3e40" };
const BACK_MIST = "#a4bccb";
const BIG: Palette = { s: "#f2f7fa", S: "#bccdd9", b: "#3a5a4a", c: "#2a4a3c", t: "#3a2a1c" };
const BARK = { d: "#24180e", m: "#3a2a1c", l: "#584030" };
const GROUND: [number, string][] = [
  [112, "#aab8c0"],
  [117, "#bccad0"],
  [122, "#c8d8dc"],
  [130, "#d0dee2"],
  [140, "#d8e4e8"],
  [152, "#d0dee2"],
  [165, "#c4d4da"],
];
const SHADOW = "#a2b2bc";
const NEEDLE = { d: "#3a5a4a", l: "#466a58", m: "#2e4e40" };
const SHRUB: Palette = { s: "#f4f8fc", S: "#c8d6e0", b: "#466a58", c: "#2e4e40", t: "#3a2a1c" };
const FRONT = { snow: "#e8f0f6", shade: "#b4c4d2", rim: "#ffffff" };

interface Big {
  x: number;
  h: number;
  w: number;
  base: number;
}
const BIGS: Big[] = [
  { x: 22, h: 112, w: 50, base: 114 },
  { x: 118, h: 84, w: 38, base: 112 },
  { x: 196, h: 124, w: 56, base: 115 },
  { x: 282, h: 92, w: 42, base: 113 },
];

// ---------------------------------------------------------------- layers

const paintSky = (p: PixelPainter): void => {
  paintNight(p, SKY, 100, 6113, 50);
  paintAurora(p, [
    { cx: 150, half: 130, y: 40, amp: 8, n: 2, phase: 1.4, len: 28 },
    { cx: 40, half: 60, y: 22, amp: 4, n: 3, phase: 0.2, len: 16 },
  ]);
};

/** A rolling mist bank with a hard top, so tree bases sink into it. */
const mist = (p: PixelPainter, top: number, c: string): void => {
  p.ridge((x) => top - 2 * wave(x, 4, top) - wave(x, 9, top * 0.7), c);
};

const paintFar = (p: PixelPainter): void => {
  p.reseed(301);
  firRow(p, FAR, 100, 26, 26, 46, 1);
  mist(p, 99, FAR_MIST);
};

const paintBack = (p: PixelPainter): void => {
  p.reseed(877);
  firRow(p, BACK, 108, 18, 40, 64, 1);
  mist(p, 108, BACK_MIST);
};

/** A big fir with a visible trunk below the lowest boughs and a blue shadow pool at its foot. */
const bigFir = (p: PixelPainter, t: Big, seed: number): void => {
  const trunkH = 8;
  p.ellipse(t.x, t.base, Math.round(t.w * 0.55), 2, SHADOW);
  for (let y = t.base - trunkH - 6; y < t.base; y++) {
    const flare = y > t.base - 3 ? 1 : 0;
    p.px(t.x - 2 - flare, y, BARK.d);
    p.px(t.x - 1, y, BARK.m);
    p.px(t.x, y, BARK.m);
    p.px(t.x + 1, y, BARK.l);
    p.px(t.x + 2 + flare, y, BARK.l);
  }
  plant(p, fir(t.h, t.w, seed, 2), t.x, t.base - trunkH, BIG);
};

/** Mid: the far snow floor and the big firs behind the clearing. */
const paintMid = (p: PixelPainter): void => {
  p.ridge((x) => 109 + Math.round(1.5 * wave(x, 5, 0.6) + wave(x, 11)), "#bccad6");
  p.ridge((x) => 111 + Math.round(1.5 * wave(x, 5, 0.6) + wave(x, 11)), GROUND[0][1]);
  BIGS.forEach((t, i) => bigFir(p, t, i * 3 + 1));
};

/** A fallen snow clump: a little heap with a lit cap and blue underside. */
const clump = (p: PixelPainter, x: number, y: number, r: number): void => {
  p.ellipse(x, y + 1, r + 1, 1, SHADOW);
  p.ellipse(x, y, r, Math.max(1, Math.round(r / 2)), "#e4eef4");
  p.hline(x - r + 2, y - Math.round(r / 2), Math.max(1, r * 2 - 3), "#ffffff");
};

/** A snow-laden juniper: a dark rounded mass, lit on the right, with a lumpy snow cap. */
const bush = (p: PixelPainter, x: number, y: number, r: number, pal: Palette): void => {
  const ry = Math.max(2, Math.round(r * 0.7));
  p.ellipse(x, y - ry, r, ry, pal.c);
  p.ellipse(x + 1, y - ry - 1, r - 1, ry - 1, pal.b);
  for (let i = -r; i <= r; i++) {
    const top = y - ry - Math.round(ry * Math.sqrt(Math.max(0, 1 - (i * i) / (r * r))));
    const cap = 1 + ((i * 3 + x) % 3 === 0 ? 1 : 0) + (Math.abs(i) < r * 0.6 ? 2 : 0);
    p.vline(x + i, top, cap, i >= 0 ? pal.s : pal.S);
  }
  p.hline(x - r + 1, y, r * 2 - 1, pal.c);
};

/** Ground: trampled snow, blue tree shadows, needles, snow clumps and small snowy shrubs. */
const paintGround = (p: PixelPainter): void => {
  strata(p, GROUND, p.h, 3);
  // long blue shadows cast by the big firs, flattened with distance
  for (const [cx, cy, rx, ry] of [
    [40, 118, 30, 2],
    [214, 119, 36, 2],
    [130, 124, 26, 3],
    [300, 122, 24, 2],
  ] as [number, number, number, number][])
    for (let y = -ry; y <= ry; y++) {
      const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))) + 0.35);
      const lobe = Math.round(2 * wave(cx + y * 9, 3));
      p.hline(cx - half + lobe, cy + y, half * 2 + 1, y + cy < 130 ? SHADOW : "#b4c4cc");
    }
  // trampled path where the fighters meet: a smoother, brighter band
  for (let x = 0; x < TILE_W; x++) {
    const y = 138 + Math.round(1.2 * wave(x, 2, 0.4));
    p.vline(x, y, 6, "#e2ecf0");
    p.px(x, y - 1, "#c4d2d8");
    if ((x * 7) % 13 < 2) p.px(x, y + 6, "#c4d2d8");
  }
  // needle litter: short dark dashes, sparse far and denser near
  p.reseed(4411);
  for (let i = 0; i < 70; i++) {
    const y = Math.floor(116 + p.rand() * p.rand() * 62);
    const x = Math.floor(p.rand() * TILE_W);
    if (y > 136 && y < 146) continue;
    const near = y > 150;
    const k = p.rand();
    let c = SHADOW;
    if (k < 0.2) c = NEEDLE.d;
    else if (k < 0.35) c = NEEDLE.l;
    p.px(x, y, c);
    if (near) p.px(x + 1, y + (p.rand() < 0.5 ? 0 : -1), c === SHADOW ? "#b4c4cc" : NEEDLE.m);
  }
  for (const [x, y, r] of [
    [70, 126, 3],
    [176, 122, 2],
    [262, 130, 4],
    [24, 150, 5],
    [148, 156, 6],
    [300, 152, 5],
  ] as [number, number, number][])
    clump(p, x, y, r);
  for (const [x, y, r] of [
    [92, 121, 4],
    [236, 124, 5],
    [8, 131, 6],
  ] as [number, number, number][])
    bush(p, x, y, r, SHRUB);
  glints(p, 116, 178, 50, "#ffffff", 91);
};

const FRONT_BUSH: Palette = { s: "#eef4f8", S: "#b8c8d4", b: "#1e3428", c: "#12221a", t: "#120c08" };

/** Front: a low snow bank along the bottom with snow-laden bushes humped into it. */
const paintFront = (p: PixelPainter): void => {
  for (const [x, r] of [
    [10, 14],
    [30, 9],
    [176, 10],
    [300, 12],
  ] as [number, number][])
    bush(p, x, 184, r, FRONT_BUSH);
  snowBank(p, (x) => 174 + 3 * wave(x, 3, 1.1) + 1.5 * wave(x, 7, 0.4), { rim: FRONT.rim, body: FRONT.snow, shade: FRONT.shade });
};

const field: Battlefield = {
  terrain: "forest",
  ambient: "snow",
  ambientColors: ["#ffffff", "#e8f2f8", "#c8d8e4"],
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
