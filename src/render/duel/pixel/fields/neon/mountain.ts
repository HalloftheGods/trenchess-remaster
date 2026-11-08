import type { Battlefield } from "../../field";
import { TILE_W, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { NEON, nightSky, strata } from "./common";

/**
 * Neon City "Iron Peaks": a rooftop among the glass towers. A cold blue night with a pale moon,
 * far spires of glass rising like a mountain range, nearer towers with lit window grids and
 * magenta crowns, and a concrete roof behind a parapet with vents, a mast and a helipad ring.
 */

// ---------------------------------------------------------------- palettes
const SKY: [number, string][] = [
  [0, "#03040c"],
  [16, "#070a1e"],
  [32, "#0b1028"],
  [48, "#101834"],
  [64, "#162040"],
  [80, "#1c2a4c"],
  [96, "#243458"],
];
const STARS = ["#2a3462", "#6a7ab0", "#dff0ff"];
const MOON = { lit: "#dff4ff", shade: "#a8cce0", halo: "#1e3456" };

interface GlassPal {
  wall: string;
  frame: string;
  sheen: string;
  rim: string;
  win: string;
  crown: string;
}
const FAR: GlassPal = { wall: "#18203a", frame: "#141a30", sheen: "#222c4a", rim: "#34446a", win: "#3a5a86", crown: "#4a6a9a" };
const MID: GlassPal = { wall: "#1a2232", frame: "#121826", sheen: "#2c3446", rim: "#4a5a74", win: NEON.ice, crown: NEON.magenta };

const ROOF = ["#2e3a4e", "#2a3242", "#252d3c", "#212836", "#1e2430", "#1a2030"];
const RSTOP = [124, 130, 138, 150, 162, 172];
const PARAPET = { cap: "#4a5a74", top: "#3a4660", face: "#222a3a", shade: "#161c28", light: NEON.ice };
const STRIA = "#34405a";
const PROP = { o: "#0e1420", d: "#1e2636", m: "#2e3a4e", l: "#46566e", h: "#6a7e9a", g: NEON.ice, r: "#ff3b5a" };

// ---------------------------------------------------------------- sky
const paintSky = (p: PixelPainter): void => {
  nightSky(p, { stops: SKY, bottom: 122, stars: STARS, seed: 53, starCount: 30 });
  const mx = 248, my = 34;
  for (let y = -12; y <= 12; y++)
    for (let x = -12; x <= 12; x++) {
      const d2 = x * x + y * y;
      if (d2 <= 11.5 * 11.5 && d2 > 10 * 10 && ((x + y) & 1) === 0) p.px(mx + x, my + y, MOON.halo);
      if (d2 <= 10 * 10 && d2 > 8.5 * 8.5) p.px(mx + x, my + y, MOON.halo);
    }
  p.disc(mx, my, 8, MOON.shade);
  p.disc(mx - 1, my - 1, 7, MOON.lit);
  p.px(mx + 2, my + 1, MOON.shade);
  p.px(mx - 3, my + 2, MOON.shade);
  p.px(mx - 2, my + 2, MOON.shade);
};

// ---------------------------------------------------------------- glass towers
type Crown = "spire" | "slant" | "flat";

/** A glass tower: mullion grid, a diagonal sheen band, scattered lit windows and a crown. */
const glassTower = (p: PixelPainter, x: number, w: number, top: number, bottom: number, pal: GlassPal, crown: Crown, lit: number): void => {
  p.rect(x, top, w, bottom - top, pal.wall);
  for (let i = 3; i < w; i += 3) p.vline(x + i, top, bottom - top, pal.frame);
  for (let y = top + 4; y < bottom; y += 4) p.hline(x, y, w, pal.frame);
  // diagonal reflection band sweeping across the glass
  for (let y = top; y < bottom; y++)
    for (let i = 1; i < w; i++) {
      const d = (i + Math.floor((y - top) * 0.6)) % (w + 14);
      if (d >= w - 3 && d < w) p.px(x + i, y, pal.sheen);
    }
  // lit windows: whole cells, one per cell
  for (let y = top + 1; y < bottom - 2; y += 4)
    for (let i = 1; i < w - 1; i += 3) if (p.rand() < lit) p.hline(x + i, y + 1, 2, pal.win);
  p.vline(x, top, bottom - top, pal.rim);
  p.vline(x + w - 1, top, bottom - top, pal.frame);
  if (crown === "spire") {
    const half = Math.floor(w / 2);
    for (let k = 1; k <= half * 1.6; k++) {
      const inset = Math.round(k / 1.6);
      p.hline(x + inset, top - k, Math.max(1, w - inset * 2), pal.wall);
      p.px(x + inset, top - k, pal.rim);
    }
    const tipY = top - Math.round(half * 1.6);
    p.vline(x + half, tipY - 6, 6, pal.rim);
    p.px(x + half, tipY - 7, pal.crown);
  } else if (crown === "slant") {
    for (let k = 1; k < w; k++) {
      p.vline(x + k, top - Math.round(k * 0.6), Math.round(k * 0.6), pal.wall);
      p.px(x + k, top - Math.round(k * 0.6), pal.rim);
    }
    p.hline(x + 2, top + 1, w - 4, pal.crown);
  } else {
    p.hline(x, top, w, pal.rim);
    p.hline(x + 1, top + 1, w - 2, pal.crown);
  }
};

const FAR_TOWERS: [number, number, number, Crown][] = [
  [0, 16, 52, "spire"], [18, 12, 70, "flat"], [32, 20, 40, "slant"], [56, 14, 30, "spire"], [72, 22, 58, "flat"],
  [98, 12, 44, "spire"], [112, 18, 74, "slant"], [134, 14, 50, "flat"], [150, 24, 36, "spire"], [178, 12, 62, "flat"],
  [192, 18, 46, "slant"], [212, 14, 28, "spire"], [228, 20, 66, "spire"], [250, 12, 50, "flat"], [264, 22, 38, "slant"],
  [288, 14, 60, "flat"], [304, 16, 44, "spire"],
];

const paintFar = (p: PixelPainter): void => {
  p.reseed(81);
  for (const [x, w, h, c] of FAR_TOWERS) glassTower(p, x, w, 112 - h, 120, FAR, c, 0.12);
  p.dither(0, 104, TILE_W, 6, "#243458", 6);
  p.rect(0, 110, TILE_W, 10, "#1e2c4a");
};

const MID_TOWERS: [number, number, number, Crown][] = [
  [6, 26, 46, "flat"], [44, 18, 62, "spire"], [78, 30, 34, "slant"], [128, 20, 54, "flat"],
  [164, 28, 40, "spire"], [208, 22, 66, "slant"], [250, 30, 36, "flat"], [292, 18, 52, "spire"],
];

const paintMid = (p: PixelPainter): void => {
  p.reseed(17);
  for (const [x, w, h, c] of MID_TOWERS) glassTower(p, x, w, 118 - h, 122, MID, c, 0.28);
  // aircraft warning beacons
  for (const [x, , h] of MID_TOWERS) if (h > 50) p.px(x + 1, 118 - h - 1, PROP.r);
};

// ---------------------------------------------------------------- rooftop
const VENT: Grid = [
  ".oooooooooo.",
  "ohhhhhhhhhlo",
  "olmmmmmmmmdo",
  "olddddddddo.",
  "olmmmmmmmmdo",
  "olddddddddo.",
  "olmmmmmmmmdo",
  "oddddddddddo",
];
const ACUNIT: Grid = [
  "oooooooooooooo",
  "ohhhhhhhhhhhlo",
  "olmmdoommdmmdo",
  "olmdoddodmmmdo",
  "olmdoddodmmmdo",
  "olmmdoodmmmmdo",
  "olmmmmmmmmmmdo",
  "oddddddddddddo",
  ".o.........o..",
];
const TANK: Grid = [
  "....oooooo....",
  "..oohhhhhloo..",
  ".ohhhmmmmmldo.",
  "olhmmmmmmmmddo",
  "olmmmmmmmmmddo",
  "olmmmmmmmmmddo",
  "olmmmmmmmmmddo",
  "oooooooooooooo",
  ".o..o....o..o.",
  ".o..o....o..o.",
  ".o..o....o..o.",
];

const paintGround = (p: PixelPainter): void => {
  // parapet wall along the far edge of the roof, with an ice light strip
  p.rect(0, 114, TILE_W, 10, PARAPET.face);
  p.rect(0, 112, TILE_W, 3, PARAPET.top);
  p.hline(0, 112, TILE_W, PARAPET.cap);
  for (let x = 0; x < TILE_W; x += 24) p.vline(x, 115, 9, PARAPET.shade);
  for (let x = 4; x < TILE_W; x += 12) p.hline(x, 118, 5, x % 24 === 4 ? PARAPET.light : "#2a6a86");
  p.hline(0, 123, TILE_W, PARAPET.shade);
  // roof deck
  strata(p, RSTOP.map((y, i): [number, string] => [y, ROOF[i]]), p.h, 3);
  // membrane seams: striae running in perspective
  for (const y of [127, 133, 146, 158, 170]) p.hline(0, y, TILE_W, STRIA);
  for (let x = 0; x < TILE_W; x += 40) {
    p.line(x, 124, x - 6, 179, STRIA);
  }
  // helipad ring between the fighters, ellipse in perspective
  const cx = 160, cy = 154;
  for (let a = 0; a < 360; a += 1) {
    const r = (a * Math.PI) / 180;
    const x = Math.round(cx + Math.cos(r) * 46);
    const y = Math.round(cy + Math.sin(r) * 11);
    if ((a >> 4) % 2 === 0) p.px(x, y, "#5a7a96");
  }
  const H: Grid = ["hh........hh", "hh........hh", "hhhhhhhhhhhh", "hh........hh", "hh........hh"];
  p.stamp(H, cx - 6, cy - 2, { h: "#5a7a96" });
  // puddles holding the window light
  for (const [x, y, w] of [[54, 140, 12], [270, 166, 16], [214, 132, 8]] as [number, number, number][]) {
    p.ellipse(x, y, w, 1, "#161c28");
    p.hline(x - 3, y, 4, "#4a6a8a");
    p.hline(x + 3, y, 2, "#6a2a6a");
  }
  // rooftop plant hugging the parapet
  for (const [x, w] of [[26, 8], [100, 16], [198, 10], [288, 8]] as [number, number][]) p.ellipse(x, 129, w, 1, "#161c28");
  p.stamp(VENT, 20, 121, PROP);
  p.stamp(ACUNIT, 86, 120, PROP);
  p.stamp(ACUNIT, 101, 121, PROP);
  p.stamp(TANK, 191, 118, PROP);
  p.stamp(VENT, 282, 122, PROP);
  // radio mast with a beacon
  p.vline(250, 70, 54, PROP.l);
  p.vline(251, 70, 54, PROP.d);
  for (let y = 76; y < 122; y += 7) {
    p.line(246, y, 250, y + 4, PROP.m);
    p.line(255, y, 251, y + 4, PROP.m);
  }
  p.rect(249, 67, 4, 3, PROP.r);
  p.px(248, 68, "#6a1a2a");
  p.px(253, 68, "#6a1a2a");
  p.hline(245, 123, 12, PROP.o);
};

// ---------------------------------------------------------------- foreground
const paintFront = (p: PixelPainter): void => {
  // a duct along the bottom edge on the left and a railing post corner on the right
  p.rect(0, 171, 110, 9, PROP.d);
  p.hline(0, 170, 110, PROP.l);
  p.hline(0, 171, 110, PROP.m);
  for (let x = 8; x < 110; x += 26) p.rect(x, 170, 3, 10, PROP.o);
  p.rect(110, 168, 6, 12, PROP.m);
  p.vline(110, 168, 12, PROP.l);
  p.rect(206, 176, 114, 4, PROP.o);
  p.hline(206, 172, 114, PROP.l);
  p.hline(206, 173, 114, PROP.o);
  for (let x = 210; x < 320; x += 22) {
    p.vline(x, 172, 8, PROP.l);
    p.vline(x + 1, 172, 8, PROP.o);
  }
};

const field: Battlefield = {
  terrain: "mountain",
  ambient: "snow",
  ambientColors: ["#cfe8ff", "#9fe8ff", "#ffffff"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.18, paint: paintFar },
    { parallax: 0.45, paint: paintMid },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
