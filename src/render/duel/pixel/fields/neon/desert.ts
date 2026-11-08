import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { NEON, nightSky, skyline, smog, strata } from "./common";

/**
 * Neon City "Endless Sands": a sodium-lit concrete wasteland under the expressway. A night sky
 * stained orange by street light, low warehouses on the horizon, an elevated highway on
 * pillars with lamps and tail-light streaks, and a cracked concrete lot littered with rubble.
 */

// ---------------------------------------------------------------- palettes
const SKY: [number, string][] = [
  [0, "#05040a"],
  [16, "#0b0814"],
  [32, "#140c1c"],
  [48, "#1f1220"],
  [62, "#2c1822"],
  [76, "#3c2024"],
  [90, "#56302a"],
  [102, "#6e4228"],
];
const STARS = ["#2e2232", "#6a5a6a", "#f0e0d0"];
const SMOG = { hi: "#5a3428", lo: "#4a2a24" };
const FAR = { walls: ["#1e1618", "#221a1a", "#1a1416"], rim: "#3a2a26", windows: ["#8a5a2a", "#6a3a22"] };
const CITY = { haze: "#3a2026", walls: ["#1c1218", "#20141a", "#181016"], rim: "#34222a", windows: ["#a0602a", "#7a4226", "#c08040"] };
const DECK = { top: "#5e5651", face: "#3a3430", under: "#201c18", lip: "#7a706a", rail: "#4a4440" };
const PILLAR = { lit: "#4e4844", base: "#3a3430", shade: "#2a2522" };
const SODIUM = { lamp: "#ffd8a0", glow: NEON.amber, warm: "#8a5a2a", pole: "#2a2522", poleLit: "#4a4440" };

const SLAB = ["#5e5651", "#57504b", "#524b46", "#4a4440", "#433d3a", "#3a3430", "#332e2b"];
const SSTOP = [116, 121, 127, 136, 148, 160, 171];
const JOINT = "#2e2a27";
const CRACK = { dark: "#201c18", glow: "#c07a3a" };
const RUBBLE = { o: "#201c18", d: "#3a3430", m: "#5a524c", l: "#7a706a", r: "#8a4a2a" };

// ---------------------------------------------------------------- sky
const paintSky = (p: PixelPainter): void => {
  nightSky(p, { stops: SKY, bottom: 122, stars: STARS, seed: 29, starCount: 14 });
};

const paintSmog = (p: PixelPainter): void => {
  smog(p, [[16, 72, 66], [110, 82, 48], [190, 68, 58], [270, 86, 44]], SMOG.hi, SMOG.lo);
};

/** The lit city far off across the wasteland, rising over the expressway deck. */
const paintCity = (p: PixelPainter): void => {
  p.dither(0, 52, TILE_W, 10, CITY.haze, 3);
  p.dither(0, 62, TILE_W, 16, CITY.haze, 7);
  // two lattice pylons carrying power across the waste
  for (const x of [58, 218]) {
    p.line(x - 7, 76, x, 30, CITY.rim);
    p.line(x + 7, 76, x, 30, CITY.rim);
    for (let y = 38; y < 76; y += 7) p.line(x - Math.round((y - 30) / 6.6), y, x + Math.round((y + 7 - 30) / 6.6), y + 7, CITY.rim);
    p.hline(x - 8, 36, 17, CITY.rim);
    p.hline(x - 6, 44, 13, CITY.rim);
    p.px(x - 8, 37, NEON.amber);
    p.px(x + 8, 37, NEON.amber);
    p.px(x, 29, "#ff3b5a");
  }
  skyline(p, { seed: 83, base: 76, bottom: 80, minH: 6, maxH: 30, minW: 8, maxW: 20, gap: 1, walls: CITY.walls, rim: CITY.rim, windows: CITY.windows, litChance: 0.22, beacon: "#ff3b5a" });
};

const paintFar = (p: PixelPainter): void => {
  skyline(p, { seed: 47, base: 112, bottom: 120, minH: 6, maxH: 26, minW: 14, maxW: 34, gap: 2, walls: FAR.walls, rim: FAR.rim, windows: FAR.windows, litChance: 0.12, beacon: "#ff3b5a" });
  // a dead billboard on stilts
  p.rect(140, 70, 30, 14, "#1a1416");
  p.hline(140, 70, 30, FAR.rim);
  p.hline(142, 76, 18, "#6a3a22");
  p.hline(142, 79, 12, "#4a2a22");
  p.vline(146, 84, 22, "#1a1416");
  p.vline(163, 84, 22, "#1a1416");
  p.dither(0, 106, TILE_W, 6, "#5a3428", 6);
  p.rect(0, 112, TILE_W, 8, "#4a2c26");
};

// ---------------------------------------------------------------- expressway
const PILLARS = [24, 104, 184, 264];

const paintHighway = (p: PixelPainter): void => {
  const top = 76;
  // pillars with flared caps
  for (const x of PILLARS) {
    p.rect(x, top + 14, 12, 120 - top - 14, PILLAR.base);
    p.vline(x, top + 14, 120 - top - 14, PILLAR.lit);
    p.rect(x + 9, top + 14, 3, 120 - top - 14, PILLAR.shade);
    p.rect(x - 4, top + 12, 20, 3, PILLAR.base);
    p.hline(x - 4, top + 12, 20, PILLAR.lit);
  }
  // deck: rail, road surface edge, face, underside shadow
  p.hline(0, top - 3, TILE_W, DECK.rail);
  for (let x = 0; x < TILE_W; x += 8) p.vline(x, top - 3, 3, DECK.rail);
  p.hline(0, top, TILE_W, DECK.lip);
  p.rect(0, top + 1, TILE_W, 2, DECK.top);
  p.rect(0, top + 3, TILE_W, 7, DECK.face);
  for (let x = 0; x < TILE_W; x += 40) p.vline(x, top + 3, 7, DECK.under);
  p.rect(0, top + 10, TILE_W, 2, DECK.under);
  p.dither(0, top + 12, TILE_W, 2, DECK.under, 8);
  // traffic: tail lights and headlights streaking along the deck
  const TRAILS: [number, number, string][] = [[12, 18, "#ff3b5a"], [70, 10, "#ffd8a0"], [132, 24, "#ff3b5a"], [196, 14, "#ffd8a0"], [250, 20, "#ff3b5a"], [300, 8, "#ffd8a0"]];
  for (const [x, len, c] of TRAILS) {
    p.hline(x, top - 1, len, c);
    p.hline(x + len - 3, top - 2, 3, c);
  }
  // sodium lamps on the deck
  for (let x = 44; x < TILE_W; x += 80) {
    p.vline(x, top - 16, 13, SODIUM.pole);
    p.hline(x, top - 16, 5, SODIUM.pole);
    p.hline(x + 3, top - 15, 3, SODIUM.lamp);
    p.px(x + 4, top - 14, SODIUM.glow);
  }
};

// ---------------------------------------------------------------- concrete lot
const LAMPS = [72, 236];

const LAMP_HEAD: Grid = [
  "pppppppppp",
  ".pllllllp.",
  "..gggggg..",
];

const CHUNK_S: Grid = [".lm.", "lmmd", "oddo"];
const CHUNK_L: Grid = ["..llm...", ".lmmmmd.", "lmmmmmdd", "lmmrmddd", "oddddddo"];
const REBAR: Grid = ["r...", ".r..", ".r.r", "..r.", "..r.", "lmmd", "oddo"];

const slabAt = (y: number): string => {
  let i = 0;
  while (i + 1 < SSTOP.length && y >= SSTOP[i + 1]) i++;
  return SLAB[i];
};

const paintGround = (p: PixelPainter): void => {
  strata(p, SSTOP.map((y, i): [number, string] => [y, SLAB[i]]), p.h, 3);
  p.hline(0, 116, TILE_W, "#6a625c");
  // slab joints: rows open up toward the viewer, the cross joints lean outward from the centre
  const rows = [119, 124, 131, 152, 166];
  for (const y of rows) p.hline(0, y, TILE_W, JOINT);
  for (let i = 0; i < rows.length; i++) {
    const y0 = rows[i];
    const y1 = rows[i + 1] ?? p.h;
    const step = 24 + i * 10;
    const off = i % 2 ? step / 2 : 0;
    for (let x = off; x < TILE_W; x += step) p.line(x, y0 + 1, x + Math.round(((x - 160) / 160) * (y1 - y0) * 0.6), y1 - 1, JOINT);
  }
  // pools of sodium light under the lamps, banded rather than smooth
  for (const x of LAMPS) {
    p.ellipse(x + 8, 134, 34, 7, slabAt(121));
    p.ellipse(x + 8, 134, 24, 5, "#64584c");
    p.ellipse(x + 8, 134, 14, 3, "#74624e");
  }
  // cracks with an ember-orange glint along one lip
  const CRACKS: [number, number, number[]][] = [
    [18, 140, [1, 0, 1, 1, 0, -1, 0, 1]],
    [120, 160, [0, 1, 1, 0, -1, 0, 0, 1, 1]],
    [196, 128, [-1, 0, 0, 1, 0, 1]],
    [278, 154, [1, 1, 0, -1, 0, 0, 1]],
  ];
  for (const [x0, y0, path] of CRACKS) {
    let y = y0;
    path.forEach((d, i) => {
      y += d;
      p.hline(x0 + i * 3, y, 3, CRACK.dark);
      if (i % 2 === 0) p.px(x0 + i * 3 + 1, y + 1, CRACK.glow);
    });
  }
  // stains and tyre marks
  for (const [x, y, w] of [[40, 158, 16], [170, 126, 10], [296, 144, 12]] as [number, number, number][]) p.ellipse(x, y, w, 2, "#3e3834");
  for (let x = 0; x < TILE_W; x++) if (wave(x, 3, 0.4) + 0.5 * wave(x, 11, 1.2) > 0.6) p.px(x, Math.round(146 + 2 * wave(x, 2, 0.8)), "#3a3430");
  // rubble and rebar
  const pal = RUBBLE;
  for (const [x, y] of [[8, 128], [150, 122], [222, 130], [306, 125], [92, 170], [262, 174]] as [number, number][]) p.stamp(CHUNK_S, x, y, pal);
  p.stamp(CHUNK_L, 112, 120, pal);
  p.stamp(CHUNK_L, 284, 160, pal);
  p.stamp(REBAR, 30, 117, pal);
  // sodium street lamps on the far edge of the lot
  for (const x of LAMPS) {
    p.vline(x, 70, 50, SODIUM.pole);
    p.vline(x + 1, 70, 50, SODIUM.poleLit);
    p.hline(x, 69, 10, SODIUM.poleLit);
    p.stamp(LAMP_HEAD, x + 4, 68, { p: SODIUM.pole, l: SODIUM.lamp, g: SODIUM.glow });
    p.rect(x - 1, 118, 4, 3, SODIUM.pole);
    p.ellipse(x + 1, 121, 4, 1, "#2e2a27");
  }
};

// ---------------------------------------------------------------- foreground
const BARRIER: Grid = [
  ".....llllllllllllllllll.....",
  "....lmmmmmmmmmmmmmmmmmmd....",
  "....lhhmmmhhhmmmhhhmmmhd....",
  "....lmhhhmmmhhhmmmhhhmmd....",
  "....lmmmmmmmmmmmmmmmmmmd....",
  "...lmmmmmmmmmmmmmmmmmmmmd...",
  "..lmmmmmmmmmmmmmmmmmmmmmmd..",
  ".lmmmmmmmmmmmmmmmmmmmmmmmmd.",
  "lmmmmmmmmmmmmmmmmmmmmmmmmmmd",
  "lmmmmmmmmmmmmmmmmmmmmmmmmmmd",
  "dddddddddddddddddddddddddddd",
];

const paintFront = (p: PixelPainter): void => {
  const pal = { l: "#8a807a", m: "#5e5651", d: "#2e2a27", h: NEON.amber };
  p.stamp(BARRIER, -10, p.h - BARRIER.length + 1, pal);
  p.stamp(BARRIER, 16, p.h - BARRIER.length + 2, pal);
  p.stamp(BARRIER, 262, p.h - BARRIER.length + 1, pal);
};

const field: Battlefield = {
  terrain: "desert",
  ambient: "sand",
  ambientColors: [NEON.amber, "#c89a70", "#8a7a6a"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.08, drift: 2, paint: paintSmog },
    { parallax: 0.12, paint: paintCity },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.5, paint: paintHighway },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
