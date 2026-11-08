import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { NEON, nightSky, skyline, strata } from "./common";

/**
 * Neon City "Whispering Woods": a holographic grove in a city park. A teal-tinged night sky,
 * a dim blue skyline, rows of translucent cyan hologram pines flickering over their projector
 * pads, magenta light pylons, and a dark paved plaza scattered with glowing litter.
 */

// ---------------------------------------------------------------- palettes
const SKY: [number, string][] = [
  [0, "#04050e"],
  [16, "#070a1c"],
  [32, "#0a1028"],
  [48, "#0e1634"],
  [62, "#121e40"],
  [76, "#16284c"],
  [90, "#1a3458"],
  [102, "#1e4062"],
];
const STARS = ["#2a3a6a", "#6a8ac0", "#cfe8ff"];
const FAR = { walls: ["#111a30", "#0f172a", "#131d36"], rim: "#1e2c4a", windows: ["#2a6a8a", "#3a4a8a"] };

interface HoloPal {
  edge: string;
  scan: string;
  fill: string;
  core: string;
}
const HOLO_FAR: HoloPal = { edge: "#1f6e86", scan: "#1a5a72", fill: "#16405a", core: "#1a4c66" };
const HOLO: HoloPal = { edge: NEON.cyan, scan: "#1fb8d8", fill: "#0f5a70", core: "#9fe8ff" };
const HOLO_PINK: HoloPal = { edge: NEON.magenta, scan: "#c02aa0", fill: "#5a1a5e", core: "#ffb0ec" };
const HOLO_PINK_FAR: HoloPal = { edge: "#8a2a7a", scan: "#6a2262", fill: "#3a1846", core: "#9a3a8a" };
const PAD = { top: "#2a3a4c", lit: NEON.cyan, side: "#121820", glow: "#1a5a6e" };
const PYLON = { pole: "#1e2636", lit: "#3a4a62", glow: NEON.magenta, halo: "#6a1e5e" };

const PLAZA = ["#1f2a3a", "#1c2430", "#19212c", "#161d27", "#121820", "#0f141b"];
const PSTOP = [114, 120, 128, 138, 152, 166];
const PATH = { top: "#2a3a4c", base: "#24303f", seam: "#1a222c", edge: NEON.cyan, edgeLo: "#1f6e86" };

// ---------------------------------------------------------------- sky + city
const paintSky = (p: PixelPainter): void => {
  nightSky(p, { stops: SKY, bottom: 120, stars: STARS, seed: 37, starCount: 28 });
};

const paintFar = (p: PixelPainter): void => {
  skyline(p, { seed: 5, base: 106, bottom: 116, minH: 10, maxH: 40, minW: 7, maxW: 18, gap: 2, walls: FAR.walls, rim: FAR.rim, windows: FAR.windows, litChance: 0.14, beacon: NEON.magenta });
  p.dither(0, 100, TILE_W, 6, "#1a3458", 5);
  p.rect(0, 106, TILE_W, 10, "#172a44");
};

// ---------------------------------------------------------------- hologram pines

/**
 * A hologram pine: stacked tiers with a bright edge, every third row a scanline and the body
 * a sparse ordered-dither fill so it reads as translucent. One row is offset as a glitch.
 */
const holoPine = (p: PixelPainter, cx: number, by: number, h: number, pal: HoloPal, glitch: number): void => {
  const tiers = h > 30 ? 4 : 3;
  const top = by - h;
  const crownH = h - 3;
  const maxHalf = Math.round(h * 0.32);
  for (let y = top; y < top + crownH; y++) {
    const v = (y - top) / crownH;
    const tier = Math.min(tiers - 1, Math.floor(v * tiers));
    const local = v * tiers - tier;
    const tierMax = maxHalf * (0.45 + 0.55 * ((tier + 1) / tiers));
    const half = Math.max(0, Math.round(tierMax * (0.35 + 0.65 * local) - (tier === 0 ? (1 - local) * tierMax * 0.35 : 0)));
    const shift = y === glitch ? 2 : 0;
    const x0 = cx - half + shift;
    const w = half * 2 + 1;
    const tierFloor = local > 1 - tiers / crownH;
    if (tierFloor) p.hline(x0, y, w, pal.edge);
    else if ((y - top) % 3 === 0) p.hline(x0 + 1, y, Math.max(1, w - 2), pal.scan);
    else p.dither(x0 + 1, y, Math.max(0, w - 2), 1, pal.fill, 6);
    p.px(x0, y, pal.edge);
    p.px(x0 + w - 1, y, pal.edge);
  }
  // bright core trunk line
  p.vline(cx, top + 2, crownH - 2, pal.core);
  p.vline(cx, top + crownH, 3, pal.scan);
  p.px(cx, top - 1, pal.core);
};

/** Projector pad under a hologram: a little metal disc with a lit rim. */
const pad = (p: PixelPainter, cx: number, y: number, r: number): void => {
  p.ellipse(cx, y + 1, r + 1, 1, PAD.side);
  p.ellipse(cx, y, r, 1, PAD.top);
  p.hline(cx - r + 1, y - 1, r * 2 - 1, PAD.lit);
};

const pylon = (p: PixelPainter, x: number, by: number, h: number): void => {
  p.vline(x, by - h, h, PYLON.pole);
  p.vline(x + 1, by - h, h, PYLON.lit);
  for (let y = by - h + 6; y < by - 2; y += 6) p.hline(x - 1, y, 4, PYLON.pole);
  p.rect(x - 1, by - h - 3, 4, 3, PYLON.glow);
  p.px(x - 2, by - h - 2, PYLON.halo);
  p.px(x + 3, by - h - 2, PYLON.halo);
  p.px(x, by - h - 4, PYLON.halo);
  p.px(x + 1, by - h - 4, PYLON.halo);
  p.hline(x - 2, by, 6, PYLON.pole);
};

const BACK_PINES: [number, number][] = [[14, 26], [40, 34], [66, 22], [104, 30], [128, 38], [160, 24], [196, 32], [222, 26], [254, 36], [288, 28], [310, 22]];
const MID_PINES: [number, number][] = [[26, 50], [76, 36], [104, 44], [150, 56], [196, 34], [222, 46], [272, 52], [302, 32]];

const paintBackGrove = (p: PixelPainter): void => {
  p.rect(0, 110, TILE_W, 8, "#14202e");
  p.hline(0, 110, TILE_W, "#1f3448");
  BACK_PINES.forEach(([x, h], i) => holoPine(p, x, 111, h, i % 4 === 2 ? HOLO_PINK_FAR : HOLO_FAR, 111 - Math.round(h * 0.6)));
  // a dim cyan light strip along the far hedge line
  for (let x = 0; x < TILE_W; x += 8) p.hline(x, 113, 4, "#1a4a5a");
};

const paintGrove = (p: PixelPainter): void => {
  // low hedge bank the grove stands on
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(116 - 1.5 * wave(x, 4, 0.6) - wave(x, 9, 2.1));
    p.vline(x, t, 122 - t, "#101824");
    p.px(x, t, "#1f2c3c");
  }
  for (const x of [56, 128, 176, 248]) pylon(p, x, 119, 34);
  MID_PINES.forEach(([x, h], i) => {
    pad(p, x, 118, h > 40 ? 6 : 4);
    holoPine(p, x, 116, h, i === 4 ? HOLO_PINK : HOLO, 116 - Math.round(h * 0.35));
  });
};

// ---------------------------------------------------------------- plaza
const LITTER: Grid[] = [["cc"], ["c", "c"], ["m."], [".c", "c."]];

const paintGround = (p: PixelPainter): void => {
  strata(p, PSTOP.map((y, i): [number, string] => [y, PLAZA[i]]), p.h, 3);
  p.hline(0, 114, TILE_W, "#2a3a4c");
  // paver seams: rows get taller and the joints wider apart nearer the viewer
  const rows = [118, 123, 129, 154, 162, 172];
  rows.forEach((y, i) => {
    p.hline(0, y, TILE_W, "#141b24");
    const step = 10 + i * 6;
    const off = i % 2 ? step / 2 : 0;
    const next = rows[i + 1] ?? p.h;
    for (let x = off; x < TILE_W; x += step) p.vline(x, y + 1, next - y - 1, "#141b24");
  });
  // the walkway the fighters stand on, edged with cyan light strips
  p.rect(0, 132, TILE_W, 18, PATH.base);
  p.rect(0, 132, TILE_W, 3, PATH.top);
  for (let x = 0; x < TILE_W; x += 20) p.vline(x + ((x / 20) % 2) * 10, 135, 15, PATH.seam);
  p.hline(0, 142, TILE_W, PATH.seam);
  p.hline(0, 131, TILE_W, PATH.edgeLo);
  for (let x = 0; x < TILE_W; x += 10) p.hline(x, 131, 6, PATH.edge);
  p.hline(0, 150, TILE_W, PATH.edgeLo);
  for (let x = 4; x < TILE_W; x += 10) p.hline(x, 150, 6, PATH.edge);
  p.hline(0, 151, TILE_W, "#0c1118");
  // glowing litter: cyan and magenta chips, sparse and kept off the walkway
  p.reseed(404);
  for (let k = 0; k < 36; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 118 + Math.floor(p.rand() * 58);
    if (y > 128 && y < 154) continue;
    const g = LITTER[Math.floor(p.rand() * LITTER.length)];
    p.stamp(g, x, y, { c: k % 3 === 0 ? NEON.magenta : "#1fb8d8", m: NEON.magenta });
  }
  // light the hologram pads cast onto the plaza
  for (const x of [26, 150, 272]) {
    p.ellipse(x, 125, 14, 2, "#1a3a4a");
    p.hline(x - 8, 125, 17, "#1f4c5e");
  }
};

// ---------------------------------------------------------------- foreground
const PLANTER: Grid = [
  ".......h.....hh...........",
  "...h..hhh...hhhh..h.......",
  "..hhhhhhhh.hhhhhhhhhh..h..",
  ".hhhhhhhhhhhhhhhhhhhhhhhh.",
  "hhhhhhhhhhhhhhhhhhhhhhhhhh",
  "cccccccccccccccccccccccccc",
  "bbbbbbbbbbbbbbbbbbbbbbbbbb",
  "bbbbbbbbbbbbbbbbbbbbbbbbbb",
  "bbbbbbbbbbbbbbbbbbbbbbbbbb",
  "bbbbbbbbbbbbbbbbbbbbbbbbbb",
];

const paintFront = (p: PixelPainter): void => {
  const pal = { h: "#0a1018", c: NEON.cyan, b: "#080c12" };
  for (const x of [-8, 128, 232]) p.stamp(PLANTER, x, p.h - PLANTER.length, pal);
  // hologram saplings flickering in two of the planters
  holoPine(p, 8, p.h - 9, 18, HOLO, p.h - 18);
  holoPine(p, 244, p.h - 9, 14, HOLO_PINK, -1);
};

const field: Battlefield = {
  terrain: "forest",
  ambient: "motes",
  ambientColors: [NEON.cyan, "#9fe8ff", NEON.magenta],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.35, paint: paintBackGrove },
    { parallax: 0.6, paint: paintGrove },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
