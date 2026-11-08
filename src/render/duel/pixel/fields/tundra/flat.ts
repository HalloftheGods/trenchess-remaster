import type { Battlefield } from "../../field";
import { wave, type PixelPainter } from "../../painter";
import type { Palette } from "../../palette";
import { NIGHT, bandAt, glints, paintAurora, paintNight, paintPeaks, snowBank, strata, striae, tinyFir, type Peak } from "./common";

/**
 * Tundra "Open Ground": a wide snowfield under the aurora. Night sky paling to an ice-blue
 * horizon, two aurora curtains, a far range of icy peaks, low snow hills with a line of tiny
 * firs, and a wind-packed snowfield with sastrugi and a sled track the fighters stand on.
 */

// ---------------------------------------------------------------- palettes
const FAR_PEAK = { lit: "#a8bcd2", shade: "#8298b4", snow: "#d4e2f0", snowShade: "#aec2da", rim: "#e8f2fa" };
const FAR_HAZE = "#b8d0e4";
const HILL_FAR = { rim: "#e4eef6", body: "#c4d4e2", shade: "#aabcd0" };
const HILL_NEAR = { rim: "#f0f6fa", body: "#d2dee8", shade: "#b4c4d6" };
const TINY_FIR: Palette = { s: "#c8d8e4", S: "#a8bccc", b: "#4a6a74", c: "#3e5c68", t: "#3a4a54" };
const GROUND: [number, string][] = [
  [116, "#c8d4e0"],
  [120, "#d2dce6"],
  [125, "#dae3ec"],
  [131, "#e2eaf1"],
  [139, "#e8eef4"],
  [150, "#eef3f8"],
  [163, "#e6edf3"],
  [173, "#dce5ee"],
];
const TRACK = { body: "#d2dde8", rut: "#b4c4d4", lip: "#f6f9fc" };
const SASTRUGI = { top: "#ffffff", shade: "#98a8b8", mid: "#c0ccda" };
const FRONT = { rim: "#ffffff", body: "#dfe8f0", shade: "#b0c0d2" };

const PEAKS: Peak[] = [
  { x: 30, y: 62, s: 0.7, snow: 12 },
  { x: 110, y: 72, s: 0.85, snow: 9 },
  { x: 176, y: 56, s: 0.62, snow: 16 },
  { x: 252, y: 68, s: 0.78, snow: 11 },
  { x: 300, y: 78, s: 0.9, snow: 8 },
  { x: 72, y: 84, s: 0.95, snow: 6 },
  { x: 214, y: 82, s: 1, snow: 7 },
];

// ---------------------------------------------------------------- layers

const paintSky = (p: PixelPainter): void => {
  paintNight(p, NIGHT, 108, 4021, 70);
  paintAurora(p, [
    { cx: 90, half: 110, y: 50, amp: 9, n: 2, phase: 0.6, len: 30 },
    { cx: 236, half: 80, y: 34, amp: 7, n: 3, phase: 2.2, len: 22 },
  ]);
};

/** Far: an icy range with a pale haze at its feet. */
const paintFar = (p: PixelPainter): void => {
  paintPeaks(p, PEAKS, FAR_PEAK, 108);
  p.ridge((x) => 100 + Math.round(1.5 * wave(x, 3, 1) + wave(x, 7)), FAR_HAZE, 108);
};

/** Back: low rolling snow hills and a line of tiny snowy firs between them. */
const paintBack = (p: PixelPainter): void => {
  const far = (x: number): number => 104 + 3 * wave(x, 2, 0.4) + 2 * wave(x, 5, 1.3);
  snowBank(p, far, HILL_FAR, 118);
  p.reseed(717);
  for (const [x0, x1] of [
    [20, 92],
    [168, 236],
  ] as [number, number][]) {
    for (let x = x0; x < x1; x += 5 + Math.round(p.rand() * 4)) {
      const h = 7 + Math.round(p.rand() * 6);
      tinyFir(p, x, Math.round(far(x)) + 2, h, TINY_FIR);
    }
  }
  const near = (x: number): number => 111 + 2 * wave(x, 3, 2.4) + wave(x, 7, 0.2);
  snowBank(p, near, HILL_NEAR, 118);
};


/** A sastrugi: a wind-carved snow ridge, lit top edge and a blue shadow on its lee side. */
const sastrugi = (p: PixelPainter, x: number, y: number, len: number): void => {
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const h = Math.round(Math.sin(Math.PI * t) * (1 + len / 14));
    for (let k = 0; k <= h; k++) p.px(x + i, y - k, k === h ? SASTRUGI.top : bandAt(GROUND, y));
    p.px(x + i, y + 1, SASTRUGI.mid);
    if (t > 0.3 && t < 0.9) p.px(x + i, y + 2, SASTRUGI.shade);
  }
};

/** Ground: wind-packed snow strata, striae, sastrugi and a sled track through the middle. */
const paintGround = (p: PixelPainter): void => {
  strata(p, GROUND, p.h, 3);
  striae(p, 118, 176, (y) => (y < 132 ? "#c0ccda" : "#d0dae6"), 913);
  // sled track: a packed band with two ruts, crossing the floor line
  for (let x = 0; x < p.w; x++) {
    const y = 143 + Math.round(1.5 * wave(x, 1, 0.8) + 0.6 * wave(x, 3, 2));
    p.vline(x, y - 3, 8, TRACK.body);
    p.px(x, y - 4, TRACK.lip);
    p.px(x, y - 2, TRACK.rut);
    p.px(x, y + 3, TRACK.rut);
    p.px(x, y + 5, TRACK.lip);
  }
  for (const [x, y, len] of [
    [36, 122, 16],
    [128, 120, 12],
    [210, 125, 20],
    [290, 121, 12],
    [6, 156, 30],
    [96, 162, 26],
    [176, 154, 34],
    [262, 166, 28],
    [72, 131, 18],
    [244, 133, 16],
  ] as [number, number, number][])
    sastrugi(p, x, y, len);
  glints(p, 120, 178, 70, "#ffffff", 77);
};

/** Front: soft drifts heaped at the bottom edge. */
const paintFront = (p: PixelPainter): void => {
  snowBank(p, (x) => 172 + 4 * wave(x, 2, 0.9) + 2 * wave(x, 5, 0.3), FRONT);
};

const field: Battlefield = {
  terrain: "flat",
  ambient: "snow",
  ambientColors: ["#ffffff", "#e0f0ff", "#c8dcf0"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.15, paint: paintFar },
    { parallax: 0.35, paint: paintBack },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;

