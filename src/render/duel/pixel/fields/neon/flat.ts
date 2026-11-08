import type { Battlefield } from "../../field";
import { FLOOR_Y, TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { NEON, hSign, nightSky, reflection, skyline, smog, strata, vSign } from "./common";

/**
 * Neon City "Open Ground": a rain-slick avenue at night. A violet sky with a magenta city glow
 * on the horizon, a hazy far skyline, nearer dark towers hung with neon signs, and wet asphalt
 * with cyan lane markings and street lamps whose light pools and reflects on the road.
 */

// ---------------------------------------------------------------- palettes
const SKY: [number, string][] = [
  [0, "#05061a"],
  [16, "#0a0a24"],
  [32, "#120e30"],
  [48, "#1c113c"],
  [62, "#2a0f3e"],
  [76, "#3c1450"],
  [88, "#5a1a5e"],
  [100, "#7a2a6a"],
];
const STARS = ["#3a3870", "#7a7ab8", "#cfe8ff"];
const SMOG = { hi: "#4a1c5a", lo: "#3a1650" };
const FAR = { walls: ["#22163f", "#1e1438", "#261a46"], rim: "#3a2560", windows: ["#8a3a9a", "#4a6aa8", "#b04a8a"] };
const MID = { walls: ["#0e1020", "#121528", "#10121e"], rim: "#262c44", windows: [NEON.cyan, NEON.ice, NEON.amber, "#2a8ab0"] };
const PANEL = "#0a0b14";
const WALK = { lip: "#4a5060", top: "#30353f", seam: "#262a33", face: "#1a1d24", faceLit: "#2a2f3a" };
const ROAD = ["#23262e", "#20232a", "#1c1f26", "#181a20", "#15171d"];
const RSTOP = [124, 130, 140, 154, 168];
const LANE = { hi: NEON.cyan, lo: "#1f7e94", dim: "#1a4a5a" };
const LAMP = { post: "#2a2f3a", postLit: "#4a5060", head: NEON.ice, glow: "#1f5a6e", pool: "#2e4350" };
const WET = { cy: "#1f6e86", cyLo: "#1a3a4a", mg: "#a02a8a", mgLo: "#4a1e48" };

// ---------------------------------------------------------------- sky + skylines
const paintSky = (p: PixelPainter): void => {
  nightSky(p, { stops: SKY, bottom: 122, stars: STARS, seed: 71, starCount: 22 });
};

const paintSmog = (p: PixelPainter): void => {
  smog(p, [[10, 66, 60], [96, 74, 44], [168, 62, 70], [254, 80, 50]], SMOG.hi, SMOG.lo);
};

const paintFar = (p: PixelPainter): void => {
  skyline(p, { seed: 11, base: 112, bottom: 120, minH: 14, maxH: 52, minW: 8, maxW: 20, gap: 1, walls: FAR.walls, rim: FAR.rim, windows: FAR.windows, litChance: 0.18, beacon: "#ff3b5a" });
  // haze at the foot of the far towers
  p.dither(0, 106, TILE_W, 4, "#3c1450", 6);
  p.rect(0, 110, TILE_W, 10, "#2c1244");
};

const paintMid = (p: PixelPainter): void => {
  const towers = skyline(p, { seed: 23, base: 118, bottom: 122, minH: 16, maxH: 50, minW: 12, maxW: 26, gap: 4, walls: MID.walls, rim: MID.rim, windows: MID.windows, litChance: 0.3, beacon: "#ff3b5a" });
  // neon signs hung on the taller tower faces, alternating upright blades and flat boards
  const glow = [NEON.magenta, NEON.cyan, NEON.amber];
  let k = 0;
  let free = -99;
  for (const t of towers) {
    if (118 - t.top < 26 || t.x < free) continue;
    const c = glow[k % glow.length];
    if (k % 2 === 0) {
      p.hline(t.x + t.w - 2, t.top + 6, 3, MID.rim);
      vSign(p, t.x + t.w, t.top + 4, 3, c, PANEL, k);
      free = t.x + t.w + 8;
    } else if (t.w >= 15) hSign(p, t.x + 2, t.top + 5, Math.floor((t.w - 7) / 4), c, PANEL, k);
    k++;
  }
};

// ---------------------------------------------------------------- ground
const LAMPS = [48, 208];
const PUDDLES: [number, number, number][] = [[118, 150, 16], [268, 160, 22], [20, 165, 12], [180, 132, 10]];

const LAMP_HEAD: Grid = [
  "pppppppp",
  "phhhhhhp",
  ".gggggg.",
  "..g..g..",
];

const roadAt = (y: number): string => {
  let i = 0;
  while (i + 1 < RSTOP.length && y >= RSTOP[i + 1]) i++;
  return ROAD[i];
};

const paintGround = (p: PixelPainter): void => {
  // sidewalk: lit lip, paving with seams, kerb face
  p.rect(0, 114, TILE_W, 8, WALK.top);
  p.hline(0, 114, TILE_W, WALK.lip);
  for (let x = 0; x < TILE_W; x += 12) p.vline(x, 115, 6, WALK.seam);
  p.hline(0, 118, TILE_W, WALK.seam);
  p.rect(0, 122, TILE_W, 2, WALK.face);
  p.hline(0, 121, TILE_W, WALK.faceLit);
  // asphalt
  strata(p, RSTOP.map((y, i): [number, string] => [y, ROAD[i]]), p.h, 3);
  // lamp light pools on the pavement and road
  for (const x of LAMPS) {
    p.ellipse(x + 7, 117, 12, 1, "#3a4250");
    p.ellipse(x + 7, 131, 26, 4, "#1f262e");
    p.ellipse(x + 7, 131, 18, 3, LAMP.pool);
  }
  // far lane: short dashes; centre line: long dashes; near edge: solid
  for (let x = 0; x < TILE_W; x += 16) p.hline(x, 128, 7, LANE.dim);
  for (let x = 0; x < TILE_W; x += 32) {
    p.hline(x, 148, 16, LANE.lo);
    p.hline(x + 1, 147, 14, LANE.hi);
  }
  p.hline(0, 171, TILE_W, LANE.lo);
  p.hline(0, 170, TILE_W, LANE.hi);
  // tar seams and cracks, few and clean
  const CRACKS: [number, number, number][] = [[12, 136, 1], [74, 158, 0], [140, 140, 1], [196, 162, 0], [246, 134, 1], [300, 154, 0]];
  for (const [x, y, d] of CRACKS) {
    const c = "#121419";
    p.hline(x, y, 4, c);
    p.hline(x + 4, y + (d ? 1 : -1), 3, c);
    p.hline(x + 7, y + (d ? 1 : -1) * 2, 2, c);
  }
  // puddles mirroring the neon
  for (const [x, y, w] of PUDDLES) {
    p.ellipse(x, y, w, 2, "#101218");
    p.hline(x - w + 3, y - 1, 3, "#2a3040");
    p.hline(x - 4, y, 6, x % 2 ? WET.mg : WET.cy);
    p.hline(x + 4, y + 1, 4, x % 2 ? WET.mgLo : WET.cyLo);
  }
  // neon colour smeared on the wet road: broken vertical streaks
  const STREAKS: [number, string, string][] = [[33, WET.mg, WET.mgLo], [100, WET.cy, WET.cyLo], [170, "#a8702a", "#4a3220"], [236, WET.mg, WET.mgLo], [294, WET.cy, WET.cyLo]];
  for (const [x, hi, lo] of STREAKS) reflection(p, x, 125, 3, 12, hi, lo);
  // manhole
  p.ellipse(150, 162, 9, 2, "#101218");
  p.ellipse(150, 162, 7, 1, "#2a2f3a");
  p.hline(146, 162, 9, "#1a1d24");
  // street lamps standing on the sidewalk, with reflections down the road
  for (const x of LAMPS) {
    p.vline(x, 80, 37, LAMP.post);
    p.vline(x + 1, 80, 37, LAMP.postLit);
    p.hline(x, 79, 8, LAMP.postLit);
    p.stamp(LAMP_HEAD, x + 4, 79, { p: LAMP.post, h: LAMP.head, g: LAMP.glow });
    p.rect(x - 1, 114, 4, 3, LAMP.post);
    reflection(p, x + 6, 125, 4, 22, "#3e8aa0", "#28485a");
  }
  // light speckle where the lamps hit the paving
  p.reseed(9);
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 126 + Math.floor(p.rand() * 52);
    if (Math.abs(y - FLOOR_Y) < 2) continue;
    p.px(x, y, y < 150 ? "#2c3038" : roadAt(y - 20));
  }
  // faint rain ripples
  for (let x = 6; x < TILE_W; x += 23) {
    const y = 134 + Math.round(10 * (1 + wave(x, 3, 0.7)));
    p.hline(x, y, 3, "#2f3540");
    p.px(x + 1, y - 1, "#2f3540");
  }
};

// ---------------------------------------------------------------- foreground
const BOLLARD: Grid = [
  ".cc.",
  "dssd",
  "dccd",
  "dssd",
  "dssd",
  "dssd",
  "dssd",
  "dssd",
];

const paintFront = (p: PixelPainter): void => {
  // a low kerb along the bottom edge with bollards
  p.rect(0, 176, TILE_W, 4, "#0c0d12");
  p.hline(0, 175, TILE_W, "#2a2f3a");
  for (const x of [10, 86, 158, 236, 304]) p.stamp(BOLLARD, x, 168, { c: NEON.cyan, s: "#1a1d24", d: "#0c0d12" });
};

const field: Battlefield = {
  terrain: "flat",
  ambient: "rain",
  ambientColors: ["#9fe8ff", "#6ab8d8", "#cfe8ff"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.08, drift: 3, paint: paintSmog },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.5, paint: paintMid },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
