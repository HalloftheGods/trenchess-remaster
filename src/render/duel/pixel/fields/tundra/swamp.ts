import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Palette } from "../../palette";
import { NIGHT, glints, paintAurora, paintNight, paintPeaks, snowBank, strata, tinyFir, wdx, type Peak } from "./common";

/**
 * Tundra "Sunken Realm": a frozen lake under a blazing aurora. Small icy peaks and a dark fir
 * shore far off, the aurora mirrored in the glassy far ice, and nearer ice crazed with white
 * cracks, dusted with snow and pierced by clumps of dead, frost-bleached reeds.
 */

// ---------------------------------------------------------------- palettes
const FAR_PEAK = { lit: "#9cb4cc", shade: "#7a92b0", snow: "#c8dcec", snowShade: "#a2b8d2", rim: "#e0eef8" };
const SHORE_FIR: Palette = { s: "#b4c8d8", S: "#8ea4b8", b: "#2e4a4c", c: "#263e42", t: "#22303a" };
const SHORE = { rim: "#e4eef6", body: "#c4d4e2", shade: "#a6b8cc" };
const MIRROR = ["#cfe8f4", "#bce0f0", "#a8d0e0"];
const AURORA_REFLECT = { hi: "#9ef0d0", lo: "#7cd0c4" };
const ICE: [number, string][] = [
  [116, "#a8d0e0"],
  [121, "#9cc8da"],
  [127, "#a8d0e0"],
  [134, "#b2d6e6"],
  [142, "#bce0f0"],
  [152, "#a8d0e0"],
  [163, "#96c2d6"],
  [172, "#86b4cc"],
];
const CRACK = { line: "#5a8aa4", lit: "#eef8fc" };
const SNOW_PATCH = { rim: "#ffffff", body: "#e4eef4", shade: "#c0d4e0" };
const REED = { l: "#c8c0a0", m: "#a09878", d: "#6e6650", frost: "#eef4f8" };
const FRONT_REED = { l: "#7a7258", m: "#585040", d: "#3a3428", frost: "#c8d8e4" };

const PEAKS: Peak[] = [
  { x: 20, y: 84, s: 0.6, snow: 7 },
  { x: 62, y: 74, s: 0.55, snow: 12 },
  { x: 124, y: 84, s: 0.65, snow: 7 },
  { x: 178, y: 88, s: 0.7, snow: 5 },
  { x: 236, y: 72, s: 0.55, snow: 12 },
  { x: 292, y: 82, s: 0.65, snow: 8 },
];

// ---------------------------------------------------------------- layers

const paintSky = (p: PixelPainter): void => {
  paintNight(p, NIGHT, 102, 2207, 80);
  paintAurora(p, [
    { cx: 70, half: 110, y: 30, amp: 7, n: 2, phase: 2.6, len: 22 },
    { cx: 200, half: 130, y: 54, amp: 10, n: 2, phase: 0.9, len: 34 },
  ]);
};

/** Far: low icy peaks beyond the lake. */
const paintFar = (p: PixelPainter): void => {
  paintPeaks(p, PEAKS, FAR_PEAK, 100);
};

/** Back: the far shore with its fir line, then the glassy far ice mirroring the aurora. */
const paintBack = (p: PixelPainter): void => {
  p.reseed(5309);
  for (let x = 2; x < TILE_W; x += 6 + Math.round(p.rand() * 7)) {
    if (wave(x, 2, 1.1) < -0.55) continue;
    tinyFir(p, x, 102, 9 + Math.round(p.rand() * 8), SHORE_FIR);
  }
  snowBank(p, (x) => 100 + 1.5 * wave(x, 3, 0.7) + wave(x, 8, 1.9), SHORE, 104);
  strata(
    p,
    MIRROR.map((c, i) => [103 + i * 5, c] as [number, string]),
    118,
    2,
  );
  // the aurora mirrored in the ice: broken horizontal dashes under the brightest curtain
  p.reseed(61);
  for (let y = 106; y < 117; y++) {
    const n = 7 + (y % 3);
    for (let i = 0; i < n; i++) {
      const x = Math.round((i / n) * TILE_W + p.rand() * 30);
      const d = Math.abs(wdx(x, 200)) / 120;
      if (d > 1 || p.rand() < d) continue;
      const len = 3 + Math.round(p.rand() * 10 * (1 - d));
      p.hline(x, y, len, (y + i) % 3 === 0 ? AURORA_REFLECT.hi : AURORA_REFLECT.lo);
    }
  }
  // a dark rim of open water along the shore
  for (let x = 0; x < TILE_W; x++) if (wave(x, 5, 0.3) > 0.2) p.px(x, 104 + Math.round(wave(x, 3, 0.7)), "#6a90a8");
};

/** A clump of dead reeds: thin leaning stalks, a few snapped and bent over, frost on the tips. */
const reeds = (p: PixelPainter, cx: number, base: number, n: number, h: number, pal: typeof REED, seed: number, thick = 1): void => {
  p.reseed(seed);
  for (let i = 0; i < n; i++) {
    const x0 = cx + Math.round((i - n / 2) * (1 + thick) + p.rand() * 2);
    const len = Math.round(h * (0.5 + 0.5 * p.rand()));
    const lean = (p.rand() - 0.5) * 0.5;
    const snap = p.rand() < 0.3 ? Math.round(len * 0.6) : -1;
    const c = i % 2 === 0 ? pal.l : pal.m;
    let x = x0;
    let y = base;
    for (let k = 0; k < len; k++) {
      x = Math.round(x0 + lean * k);
      y = base - k;
      if (snap > 0 && k > snap) {
        // the snapped top hangs down and out
        const d = k - snap;
        p.rect(x + d * (lean >= 0 ? 1 : -1), base - snap + Math.round(d * 0.6), thick, 1, pal.d);
        continue;
      }
      p.px(x, y, k < 2 ? pal.d : c);
      if (thick > 1) p.px(x + 1, y, pal.d);
    }
    if (snap < 0) p.px(x, y, pal.frost);
  }
  p.hline(cx - n - 1, base + 1, n * 2 + 3, pal.frost);
};

/** A crack: a jagged run across the ice, flatter far away, with a lit lip under its dark line. */
const crack = (p: PixelPainter, x: number, y: number, len: number, flat: number, seed: number): void => {
  p.reseed(seed);
  let [cx, cy] = [x, y];
  let dir = p.rand() < 0.5 ? -1 : 1;
  for (let k = 0; k < len; ) {
    const seg = 3 + Math.round(p.rand() * 6);
    const nx = cx + seg;
    const ny = cy + Math.round(dir * seg * flat * p.rand());
    p.line(cx, cy + 1, nx, ny + 1, CRACK.lit);
    p.line(cx, cy, nx, ny, CRACK.line);
    // a short branch now and then
    if (p.rand() < 0.35) p.line(nx, ny, nx + 2 + Math.round(p.rand() * 4), ny - dir * (1 + Math.round(p.rand() * 2)), CRACK.line);
    [cx, cy] = [nx, ny];
    if (p.rand() < 0.4) dir = -dir;
    k += seg;
  }
};

/** Ground: the near ice, cracks, snow patches, glints and reed clumps frozen in. */
const paintGround = (p: PixelPainter): void => {
  strata(p, ICE, p.h, 3);
  // the shore edge of the near ice: a thin snow lip
  for (let x = 0; x < TILE_W; x++) p.px(x, 116, wave(x, 9, 0.5) > -0.3 ? "#d8e8f2" : ICE[0][1]);
  // long polished streaks reflecting the sky
  for (const [x, y, len] of [
    [20, 124, 40],
    [150, 122, 54],
    [250, 128, 30],
    [70, 150, 60],
    [210, 158, 70],
  ] as [number, number, number][]) {
    p.hline(x, y, len, "#c6e6f4");
    p.hline(x + 6, y + 1, len - 12, "#d6eef8");
  }
  for (const [x, y, len, flat, seed] of [
    [10, 120, 40, 0.3, 11],
    [130, 126, 50, 0.35, 23],
    [230, 121, 36, 0.3, 37],
    [60, 134, 46, 0.45, 41],
    [180, 146, 70, 0.5, 53],
    [270, 138, 40, 0.45, 67],
    [0, 160, 60, 0.6, 71],
    [110, 168, 80, 0.6, 83],
    [240, 165, 60, 0.6, 97],
  ] as [number, number, number, number, number][])
    crack(p, x, y, len, flat, seed);
  // wind-blown snow patches lying on the ice
  for (const [cx, cy, rx, ry] of [
    [96, 120, 14, 1],
    [262, 133, 20, 2],
    [30, 146, 24, 2],
    [160, 174, 34, 3],
  ] as [number, number, number, number][]) {
    p.ellipse(cx, cy + 1, rx + 2, ry, SNOW_PATCH.shade);
    p.ellipse(cx, cy, rx, ry, SNOW_PATCH.body);
    p.hline(cx - Math.round(rx * 0.6), cy - ry, Math.round(rx * 1.2), SNOW_PATCH.rim);
  }
  reeds(p, 190, 121, 5, 12, REED, 7);
  reeds(p, 44, 127, 6, 15, REED, 19);
  reeds(p, 304, 124, 4, 13, REED, 31);
  glints(p, 118, 178, 40, "#ffffff", 151);
};

/** Front: big dark reed clumps frozen into a snowy lip at the bottom corners. */
const paintFront = (p: PixelPainter): void => {
  reeds(p, 12, 177, 10, 34, FRONT_REED, 3, 2);
  reeds(p, 140, 178, 6, 20, FRONT_REED, 5, 2);
  reeds(p, 262, 177, 8, 28, FRONT_REED, 9, 2);
  snowBank(p, (x) => 176 + 2 * wave(x, 3, 0.2) + wave(x, 8, 1.3), { rim: "#ffffff", body: "#dce8f0", shade: "#b0c4d4" });
};

const field: Battlefield = {
  terrain: "swamp",
  ambient: "motes",
  ambientColors: ["#e0f8ff", "#bce0f0", "#9effd0"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.15, paint: paintFar },
    { parallax: 0.35, paint: paintBack },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
