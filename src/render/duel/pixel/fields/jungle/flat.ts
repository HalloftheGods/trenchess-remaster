import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { mix, type Palette } from "../../palette";
import { BLOOM, bandAt, canopy, crownRow, frondClump, hazeStreaks, hills, jungleSky, palm, strata, tuftField, ziggurat } from "./common";

/**
 * Jungle "Open Ground": a sunlit clearing in the steaming jungle. A low gold sun in a green
 * sky, hazy hills with a far temple, a rounded canopy wall with palms, and a lush meadow with
 * a red-clay track where the fighters stand.
 */

// ---------------------------------------------------------------- palettes
const HAZE = { hi: "#f4e2a0", lo: "#d8c880" };
const FAR1 = { fill: "#9aa86a", rim: "#b4b878" };
const FAR2 = { fill: "#7a965c", rim: "#90a668" };
const FAR_TEMPLE = { lit: "#a8b47a", face: "#8c9e66", shade: "#7c905c", moss: "#80985c", dark: "#62784c" };
const BACK = { rim: "#8ab45c", lit: "#6e9e4c", mid: "#5a8a44", shade: "#4a763c", fill: "#426a36" };
const BACK_PALM = { trunk: "#4e6a3c", leaf: "#4a763c" };
const MID = { rim: "#9ad060", lit: "#6ab848", mid: "#4f9a38", shade: "#3a7e2e", fill: "#2e6a24" };
const GROUND: [number, string][] = [
  [112, "#7cbc52"],
  [116, "#70b44a"],
  [121, "#66ac44"],
  [127, "#5ea63e"],
  [134, "#56a03a"],
  [142, "#4e9636"],
  [152, "#468a32"],
  [164, "#3c7c2c"],
];
const TONE = { tip: "#c8f080", blade: "#9ad868", dark: "#1e4a16" };
const CLAY = { lip: "#3e7a2a", edge: "#6a4a2a", shade: "#8a5e36", base: "#a87444", light: "#c08a54", pebble: "#d8a870", pebbleShade: "#7a5232" };
const FLOWER: Palette[] = [
  { p: "#ff7a9a", c: "#ffe070" },
  { p: "#fff4e0", c: "#f0b030" },
  { p: "#ffb040", c: "#c04a20" },
];
const FRONT = { body: "#14361a", lit: "#2a5a28" };

// ---------------------------------------------------------------- layers

const paintSky = (p: PixelPainter): void => jungleSky(p, { sunX: 96, sunY: 90, horizon: 104, stars: 10 });

const paintHaze = (p: PixelPainter): void => {
  hazeStreaks(
    p,
    [
      [20, 52, 70],
      [150, 44, 56],
      [236, 60, 64],
      [100, 72, 48],
      [290, 36, 40],
    ],
    HAZE.hi,
    HAZE.lo,
  );
};

/** Far: two soft ranges of hills and a temple top rising out of the nearer one. */
const paintFar = (p: PixelPainter): void => {
  hills(p, (x) => 84 - 6 * wave(x, 2, 0.7) - 3 * wave(x, 5, 1.9), FAR1.fill, FAR1.rim);
  ziggurat(p, 232, 96, 34, 5, 4, FAR_TEMPLE);
  hills(p, (x) => 95 - 4 * wave(x, 3, 2.4) - 2 * wave(x, 7, 0.3), FAR2.fill, FAR2.rim);
};

/** Back: the far wall of the clearing, a rounded canopy line with a few palms above it. */
const paintBack = (p: PixelPainter): void => {
  for (const [x, h, lean] of [
    [30, 26, 5],
    [44, 20, -4],
    [168, 24, 6],
    [280, 28, -5],
  ] as [number, number, number][])
    palm(p, x, 100, h, lean, BACK_PALM.trunk, BACK_PALM.leaf);
  canopy(p, crownRow(p, 61, 102, 13, 6, 10, 6), BACK, p.h);
};

/** Bushes at the clearing's edge: one lit row of crowns hugging the far meadow. */
const paintMid = (p: PixelPainter): void => {
  const crowns = crownRow(p, 433, 112, 18, 5, 9, 4).filter((_c, i) => i % 4 !== 1);
  canopy(p, crowns, MID, 114, false);
};

// ---------------------------------------------------------------- ground

/** The track: a wavy red-clay band crossing the meadow under the fighters. */
const trackTop = (x: number): number => 133 + 1.5 * wave(x, 2, 0.4) + wave(x, 5, 1.1);
const trackBottom = (x: number): number => 149 + 2 * wave(x, 3, 2.2) + wave(x, 7, 0.6);

const PEBBLES: Grid[] = [["lb"], [".l.", "lbs"], [".ll.", "lbbs", ".ss."]];

const paintTrack = (p: PixelPainter): void => {
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(trackTop(x));
    const b = Math.round(trackBottom(x));
    p.vline(x, t, b - t, CLAY.base);
    p.vline(x, t, 2, CLAY.shade);
    p.px(x, t - 1, CLAY.lip);
    p.px(x, b, CLAY.edge);
    p.px(x, b + 1, CLAY.lip);
  }
  // two wheel-worn ruts and lighter dry patches
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(trackTop(x));
    if ((x + 3) % 23 < 15) p.px(x, t + 5, CLAY.shade);
    if ((x + 11) % 29 < 19) p.px(x, t + 11, CLAY.shade);
  }
  for (const [cx, cy, rx] of [
    [70, 141, 16],
    [196, 139, 12],
    [292, 143, 18],
  ] as [number, number, number][])
    p.ellipse(cx, cy, rx, 1, CLAY.light);
  const pal: Palette = { l: CLAY.pebble, b: CLAY.light, s: CLAY.pebbleShade };
  p.reseed(902);
  for (let k = 0; k < 16; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = Math.round(trackTop(x)) + 3 + Math.floor(p.rand() * 11);
    p.stamp(PEBBLES[Math.floor(p.rand() * 3)], x, y, pal);
  }
};

const paintGround = (p: PixelPainter): void => {
  strata(p, GROUND, p.h, 3);
  // broad soft mottling: darker drifts of lush grass
  for (const [cx, cy, rx, ry] of [
    [40, 120, 26, 2],
    [210, 124, 30, 2],
    [120, 158, 44, 5],
    [280, 166, 40, 6],
  ] as [number, number, number, number][])
    for (let y = -ry; y <= ry; y++) {
      const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))) + 0.35);
      p.hline(cx - half, cy + y, half * 2 + 1, mix(bandAt(GROUND, cy + y), TONE.dark, 0.14));
    }
  paintTrack(p);
  const off = (x: number, y: number): boolean => y < trackTop(x) - 1 || y > trackBottom(x) + 9;
  tuftField(p, 5150, 114, 0.4, (y) => bandAt(GROUND, y), TONE, off);
  p.reseed(77);
  for (let k = 0; k < 26; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 116 + Math.floor(p.rand() * 60);
    if (!off(x, y)) continue;
    p.stamp(BLOOM, x, y, FLOWER[k % 3]);
  }
};

/** Front: dark fern clumps along the bottom edge. */
const paintFront = (p: PixelPainter): void => {
  for (const [cx, s] of [
    [18, 1],
    [140, 0.7],
    [236, 0.9],
  ] as [number, number][])
    frondClump(p, cx, s, FRONT.body, FRONT.lit);
  p.ridge((x) => 174 + Math.round(1.5 * wave(x, 4, 0.7) + wave(x, 9)), FRONT.body);
};

const field: Battlefield = {
  terrain: "flat",
  ambient: "pollen",
  ambientColors: ["#fff0a0", "#e8f0a0", "#ffffff"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.08, drift: 2, paint: paintHaze },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.4, paint: paintBack },
    { parallax: 0.65, paint: paintMid },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
