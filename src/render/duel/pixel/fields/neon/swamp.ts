import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { NEON, halo, nightSky, skyline, smog, strata } from "./common";

/**
 * Neon City "Sunken Realm": the toxic works. A sickly green smog over the night sky, a far
 * refinery of stacks, cooling towers and tanks, nearer pipelines on trestles under sodium-yellow
 * pylons, and a sludge bank between glowing pools of toxic green.
 */

// ---------------------------------------------------------------- palettes
const SKY: [number, string][] = [
  [0, "#03050a"],
  [18, "#060a12"],
  [34, "#080f16"],
  [50, "#0b161a"],
  [64, "#0e1e1e"],
  [78, "#12281f"],
  [92, "#163222"],
  [104, "#1c3e26"],
];
const STARS = ["#1e3a3a", "#4a7a6a", "#c8ffd0"];
const SMOG = { hi: "#24502e", lo: "#1c4026" };
const WORKS = { body: "#0b1814", side: "#12241c", rim: "#26463a", deep: "#08120f", light: NEON.yellow, toxic: NEON.toxic, smoke: "#1e3a2a", smokeLit: "#2a4c34" };
const PIPE = { hi: "#4a5a50", base: "#2e3a34", shade: "#1c2622", band: "#6a5a2a", rust: "#5a3a22" };
const POLE = { pole: "#1a2420", lit: "#34443c", lamp: NEON.yellow, glow: "#6a5a1a" };

const MUD = ["#1f3a2e", "#1b3028", "#172a22", "#13241d", "#10201a"];
const MSTOP = [124, 128, 134, 142, 150];
const GOO = { rim: "#0d1a12", deep: "#174a26", mid: "#22803a", hi: "#3ac452", glow: NEON.toxic, glint: "#c8ffd0" };
const GRATE = { frame: "#2c3a34", bar: "#0e1612", lit: "#46584e" };

// ---------------------------------------------------------------- sky
const paintSky = (p: PixelPainter): void => {
  nightSky(p, { stops: SKY, bottom: 122, stars: STARS, seed: 19, starCount: 16 });
};

const paintSmog = (p: PixelPainter): void => {
  smog(p, [[0, 44, 70], [120, 36, 40], [170, 52, 64], [250, 30, 56]], SMOG.hi, SMOG.lo);
};

/** The glass city across the marsh, hazed green by the works' fumes. */
const CITY = { walls: ["#10241f", "#122820", "#0f221d"], rim: "#1a362a", windows: ["#24543c", "#2e6a44", "#3a7e4a"], haze: "#1c3e26" };

const paintCity = (p: PixelPainter): void => {
  halo(p, 70, 104, 46, "#173322", 5);
  halo(p, 236, 104, 40, "#173322", 5);
  skyline(p, { seed: 61, base: 100, bottom: 104, minH: 14, maxH: 52, minW: 7, maxW: 18, gap: 3, walls: CITY.walls, rim: CITY.rim, windows: CITY.windows, litChance: 0.14, beacon: "#ff3b5a" });
  p.dither(0, 86, TILE_W, 8, CITY.haze, 4);
  p.dither(0, 94, TILE_W, 10, CITY.haze, 9);
};

// ---------------------------------------------------------------- refinery
/** A hyperbolic cooling tower: pinched waist, flared lip. */
const coolingTower = (p: PixelPainter, cx: number, base: number, h: number, r: number): void => {
  for (let y = 0; y < h; y++) {
    const v = y / h;
    const half = Math.round(r * (0.72 + 0.5 * (v - 0.62) * (v - 0.62) * 2.4));
    p.hline(cx - half, base - y, half * 2 + 1, WORKS.body);
    p.hline(cx - half, base - y, Math.max(1, Math.round(half * 0.4)), WORKS.side);
    p.px(cx - half, base - y, WORKS.rim);
  }
  p.hline(cx - Math.round(r * 0.9), base - h, Math.round(r * 1.8) + 1, WORKS.rim);
  p.hline(cx - Math.round(r * 0.9), base - h + 1, Math.round(r * 1.8) + 1, WORKS.deep);
};

const stack = (p: PixelPainter, x: number, base: number, h: number, w: number): void => {
  p.rect(x, base - h, w, h, WORKS.body);
  p.vline(x, base - h, h, WORKS.rim);
  for (let y = base - h + 4; y < base; y += 9) p.hline(x, y, w, WORKS.rim);
  p.px(x + 1, base - h + 1, "#ff3b5a");
};

/** A smoke plume: overlapping puffs that grow and lean downwind, lit on top, thinning to dither. */
const plume = (p: PixelPainter, x: number, y: number, len: number): void => {
  for (let k = 0; k < len; k++) {
    const r = 2 + Math.floor(k * 0.5);
    const cx = x + Math.round(k * k * 0.22 + k);
    const cy = y - Math.round(k * 2.2);
    if (k >= len - 3) {
      p.dither(cx - r, cy - r + 1, r * 2, r, WORKS.smoke, 10 - (k - len + 3) * 3);
      continue;
    }
    p.ellipse(cx, cy, r, Math.max(1, r - 1), WORKS.smoke);
    p.hline(cx - r + 1, cy - r + 1, r, WORKS.smokeLit);
  }
};

const paintWorks = (p: PixelPainter): void => {
  const base = 112;
  // tank farm and sheds along the base
  for (let x = 0; x < TILE_W; x += 16) {
    const h = 6 + Math.round(3 * (1 + wave(x, 5, 0.4)));
    p.rect(x, base - h, 14, h + 8, WORKS.body);
    p.hline(x, base - h, 14, WORKS.rim);
    if ((x / 16) % 3 === 1) for (let i = 2; i < 12; i += 3) p.px(x + i, base - h + 3, i % 2 ? WORKS.light : "#2a7a3a");
  }
  for (const [cx, r] of [[60, 9], [212, 7], [252, 10]] as [number, number][]) {
    p.ellipse(cx, base - 10, r, 3, WORKS.rim);
    p.rect(cx - r, base - 10, r * 2 + 1, 12, WORKS.body);
    p.vline(cx - r, base - 10, 10, WORKS.rim);
  }
  coolingTower(p, 30, base, 40, 13);
  coolingTower(p, 172, base, 34, 11);
  for (const [x, h] of [[96, 58], [104, 50], [140, 44], [292, 54]] as [number, number][]) stack(p, x, base, h, 4);
  plume(p, 98, base - 60, 9);
  plume(p, 106, base - 52, 7);
  plume(p, 294, base - 56, 8);
  plume(p, 30, base - 42, 6);
  // a gantry: lattice girder between two stacks
  for (let x = 108; x < 140; x += 4) {
    p.line(x, base - 30, x + 4, base - 24, WORKS.rim);
    p.line(x, base - 24, x + 4, base - 30, WORKS.rim);
  }
  p.hline(108, base - 30, 32, WORKS.rim);
  p.hline(108, base - 24, 32, WORKS.rim);
  // work lights: sodium yellow and toxic green
  const LIGHTS: [number, number, string][] = [[22, 98, WORKS.light], [64, 104, WORKS.toxic], [120, 92, WORKS.light], [180, 96, WORKS.toxic], [226, 104, WORKS.light], [258, 100, WORKS.light], [306, 94, WORKS.toxic], [8, 106, WORKS.toxic], [150, 106, WORKS.light]];
  for (const [x, y, c] of LIGHTS) p.px(x, y, c);
  // smog pooled over the works
  p.dither(0, 106, TILE_W, 6, "#163222", 6);
  p.rect(0, 112, TILE_W, 8, "#142a1e");
};

// ---------------------------------------------------------------- pipelines
const pipeRun = (p: PixelPainter, y: number, x0: number, len: number): void => {
  p.hline(x0, y - 2, len, PIPE.hi);
  p.rect(x0, y - 1, len, 2, PIPE.base);
  p.hline(x0, y + 1, len, PIPE.shade);
  for (let x = x0 + 6; x < x0 + len; x += 22) p.rect(x, y - 2, 2, 4, PIPE.band);
};

const pylon = (p: PixelPainter, x: number, by: number, h: number): void => {
  p.vline(x, by - h, h, POLE.pole);
  p.vline(x + 1, by - h, h, POLE.lit);
  p.hline(x - 3, by - h, 8, POLE.lit);
  p.rect(x - 3, by - h + 1, 2, 1, POLE.lamp);
  p.rect(x + 3, by - h + 1, 2, 1, POLE.lamp);
  p.px(x - 3, by - h + 2, POLE.glow);
  p.px(x + 4, by - h + 2, POLE.glow);
};

const paintPipes = (p: PixelPainter): void => {
  // trestles
  for (let x = 4; x < TILE_W; x += 40) {
    p.vline(x, 104, 18, PIPE.shade);
    p.vline(x + 1, 104, 18, PIPE.base);
    p.line(x - 5, 121, x, 112, PIPE.shade);
    p.line(x + 6, 121, x + 1, 112, PIPE.shade);
  }
  pipeRun(p, 106, 0, TILE_W);
  pipeRun(p, 113, 0, TILE_W);
  // a riser that bends up and over
  p.rect(150, 88, 4, 18, PIPE.base);
  p.vline(150, 88, 18, PIPE.hi);
  p.rect(150, 86, 30, 4, PIPE.base);
  p.hline(150, 86, 30, PIPE.hi);
  p.rect(176, 88, 4, 18, PIPE.base);
  p.vline(179, 88, 18, PIPE.shade);
  // valve wheel
  p.ellipse(222, 100, 3, 3, PIPE.band);
  p.ellipse(222, 100, 1, 1, PIPE.shade);
  p.vline(222, 103, 2, PIPE.base);
  for (const x of [70, 230]) pylon(p, x, 120, 40);
};

// ---------------------------------------------------------------- ground
const FAR_EDGE = (x: number): number => 125 + 1.5 * wave(x, 3, 0.9) + wave(x, 7, 2.3);
const NEAR_EDGE = (x: number): number => 156 + 2 * wave(x, 2, 2.6) + 1.5 * wave(x, 5, 0.6) + 0.8 * wave(x, 11, 1.7);

const GOO_BANDS = (p: PixelPainter, y0: number, y1: number): void => {
  strata(p, [[y0, GOO.hi], [y0 + 2, GOO.mid], [y0 + Math.round((y1 - y0) * 0.5), GOO.deep]], y1, 2);
};

const DRUM: Grid = [
  ".kkkkk.",
  "krrrrRk",
  "kbbbbbk",
  "krrrrRk",
  "krrrrRk",
  "kbbbbbk",
  "krrrrRk",
  ".kkkkk.",
];

const paintGround = (p: PixelPainter): void => {
  // far toxic pool along the horizon
  GOO_BANDS(p, 118, 130);
  p.hline(0, 118, TILE_W, GOO.rim);
  // the sludge bank the fighters stand on
  strata(p, MSTOP.map((y, i): [number, string] => [y, MUD[i]]), 160, 3);
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(FAR_EDGE(x));
    p.vline(x, t, 128 - t, MUD[0]);
    p.px(x, t, "#2c4c3a");
    p.px(x, t - 1, GOO.rim);
  }
  // near toxic pool
  GOO_BANDS(p, 152, p.h);
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(NEAR_EDGE(x));
    p.vline(x, 150, e - 150, MUD[4]);
    p.px(x, e, GOO.rim);
    p.px(x, e + 1, GOO.glow);
  }
  // glowing streaks and glints on the pools
  p.reseed(66);
  for (let k = 0; k < 18; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 121 + Math.floor(p.rand() * 3);
    p.hline(x, y, 4 + Math.floor(p.rand() * 8), GOO.glow);
  }
  for (let y = 164; y < p.h; y += 3) {
    for (let k = 0; k < 6; k++) {
      const x = Math.floor(p.rand() * TILE_W);
      p.hline(x, y, 3 + Math.floor(p.rand() * 6) + (y - 160) / 3, y < 170 ? GOO.hi : GOO.mid);
    }
  }
  // bubbles
  const BUBBLES: [number, number][] = [[30, 166], [96, 172], [140, 164], [204, 170], [262, 167], [300, 175], [180, 121], [52, 122]];
  for (const [x, y] of BUBBLES) {
    p.px(x, y, GOO.glint);
    p.px(x - 1, y + 1, GOO.glow);
    p.px(x + 1, y + 1, GOO.glow);
    p.px(x, y + 1, GOO.deep);
  }
  // sodium pylon light in the near pool
  for (const x of [70, 230]) {
    for (let k = 0; k < 10; k++) if (k % 3 !== 2) p.hline(x - 2 + ((k >> 1) % 2), 162 + k * 1.6, 4 - (k >> 2), "#8a8a2a");
  }
  // sludge texture: clumps, oily sheen and a few metal grates
  p.reseed(12);
  for (let k = 0; k < 30; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 131 + Math.floor(p.rand() * 22);
    if (y > 136 && y < 144) continue;
    p.hline(x, y, 3, MUD[4]);
    p.hline(x + 1, y - 1, 2, "#2c4c3a");
  }
  // small toxic puddles on the bank
  for (const [x, y, w] of [[96, 133, 9], [252, 132, 7], [20, 148, 6], [170, 150, 8]] as [number, number, number][]) {
    p.ellipse(x, y, w + 1, 2, GOO.rim);
    p.ellipse(x, y, w, 1, GOO.mid);
    p.hline(x - w + 2, y - 1, w, GOO.hi);
    p.hline(x - 2, y, 3, GOO.glow);
  }
  for (const x of [38, 196]) {
    p.rect(x, 144, 18, 5, GRATE.frame);
    p.hline(x, 144, 18, GRATE.lit);
    for (let i = 2; i < 17; i += 3) p.vline(x + i, 145, 3, GRATE.bar);
  }
  for (const [x, y] of [[120, 146], [282, 140]] as [number, number][]) {
    p.ellipse(x, y, 8, 1, "#2a3a2a");
    p.hline(x - 3, y, 4, "#3a5a5a");
    p.hline(x + 1, y, 3, "#4a3a5a");
  }
  // rusted drums on the bank
  const pal = { k: "#0c1410", r: PIPE.rust, R: "#7a5232", b: "#3a2a1a" };
  p.stamp(DRUM, 148, 124, pal);
  p.stamp(DRUM, 155, 125, pal);
  p.stamp(DRUM, 300, 127, pal);
};

// ---------------------------------------------------------------- foreground
const paintFront = (p: PixelPainter): void => {
  // a fat pipe crossing the bottom left, a broken stub on the right
  const y = 172;
  p.rect(0, y, 96, 8, PIPE.shade);
  p.hline(0, y, 96, PIPE.hi);
  p.rect(0, y + 1, 96, 3, PIPE.base);
  for (const x of [20, 70]) p.rect(x, y - 1, 3, 9, PIPE.band);
  p.rect(96, y - 2, 4, 10, PIPE.base);
  p.vline(99, y - 2, 10, PIPE.shade);
  // drip of goo from the pipe mouth
  p.vline(101, y + 2, 4, GOO.glow);
  p.px(101, y + 7, GOO.glint);
  p.rect(232, 174, 50, 6, PIPE.shade);
  p.hline(232, 174, 50, PIPE.hi);
  p.rect(228, 172, 4, 8, PIPE.base);
};

const field: Battlefield = {
  terrain: "swamp",
  ambient: "fireflies",
  ambientColors: [NEON.toxic, "#c8ffd0", NEON.yellow],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.08, drift: 2, paint: paintSmog },
    { parallax: 0.12, paint: paintCity },
    { parallax: 0.2, paint: paintWorks },
    { parallax: 0.5, paint: paintPipes },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
