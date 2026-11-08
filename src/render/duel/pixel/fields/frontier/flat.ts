import type { Battlefield } from "../../field";
import type { Palette } from "../../palette";
import { FLOOR_Y, TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { bandAt, fence, paintDuskSky, paintMesas, paintStreaks, plant, strata, tuftFor, type Mesa } from "./common";

/**
 * Frontier "Open Ground": the dry prairie at amber dusk. A low sun behind hazy red mesas, rolling
 * golden swells with a windmill and a fence line, and a sun-bleached grass floor crossed by a
 * rutted wagon trail the fighters stand on.
 */

// ---------------------------------------------------------------- palettes
const HAZE = { lit: "#c0705a", shade: "#a85c52", band: "#9a5250", rim: "#e89a6a" };
const SWELL = { far: "#a8885a", farRim: "#d0a868", rim: "#e0c070", base: "#c0a050", shade: "#a88c44", deep: "#8a7438" };
const MILL: Palette = { o: "#4a3022", w: "#6a4a32", l: "#c08a52" };
const GROUND = ["#dcc47a", "#d2ba6c", "#c6ac5e", "#b89c50", "#a68a44", "#8e763a"];
const GSTOP = [114, 119, 125, 133, 150, 165];
const DIRT = { lip: "#8a7436", deep: "#7a5434", shade: "#94683e", base: "#ae7e4c", light: "#c49862", pebble: "#e0c08a", pebbleShade: "#7a5434" };
const FLOWER: Palette = { o: "#e8763a", p: "#b878c8", y: "#f4d860", s: "#7a6830" };

// ---------------------------------------------------------------- far mesas
const FAR_MESAS: Mesa[] = [
  { x: 40, y: 80, w: 16, cap: 11, slope: 0.6 },
  { x: 74, y: 92, w: 6, cap: 6, slope: 0.7 },
  { x: 128, y: 90, w: 9, cap: 8, slope: 0.6 },
  { x: 182, y: 76, w: 24, cap: 12, slope: 0.5 },
  { x: 282, y: 86, w: 12, cap: 9, slope: 0.55 },
];

const paintFar = (p: PixelPainter): void => {
  paintMesas(p, FAR_MESAS, HAZE, 114);
  // dust haze lying low over the plain, catching the sun
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(103 + 1.5 * wave(x, 3, 0.4) + wave(x, 8, 2.1));
    p.vline(x, t, 114 - t, "#d88a62");
    p.px(x, t, "#eaa874");
  }
};

// ---------------------------------------------------------------- swells, windmill, fence
const backTop = (x: number): number => 106 - 2.5 * wave(x, 2, 1.1) - 1.5 * wave(x, 5, 0.3);
const midTop = (x: number): number => 111 - 2.5 * wave(x, 3, 2.4) - 1.2 * wave(x, 7, 0.9);

const WINDMILL: Grid = [
  "....l.....",
  "..l.o.l...",
  "...ooo....",
  ".looOool..",
  "...ooo....",
  "..l.o.l...",
  "....o.....",
  "....oo....",
  "...o.wo...",
  "...o.wo...",
  "...owwo...",
  "..o..w.o..",
  "..o.ww.o..",
  "..oww..o..",
  ".o..ww..o.",
  ".o.w..w.o.",
  ".ow....wo.",
  "o........o",
];

const paintMid = (p: PixelPainter): void => {
  p.ridge(backTop, SWELL.far, 124);
  for (let x = 0; x < TILE_W; x++) if (backTop(x + 1) < backTop(x - 1)) p.px(x, Math.round(backTop(x)), SWELL.farRim);
  // a few far cottonwoods on the back swell
  for (const x of [22, 96, 160, 248]) {
    const t = Math.round(backTop(x));
    p.ellipse(x, t - 3, 3, 2, "#8a6e4a");
    p.px(x + 2, t - 5, "#b08a5a");
    p.vline(x, t - 1, 2, "#7a5e40");
  }
  p.ridge(midTop, SWELL.base, 124);
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(midTop(x));
    const slope = midTop(x + 1) - midTop(x - 1);
    p.px(x, t, slope < 0 ? SWELL.rim : SWELL.base);
    if (slope < -0.3) p.px(x, t + 1, SWELL.rim);
  }
  p.dither(0, 116, TILE_W, 4, SWELL.shade, 6);
  // windmill on the crest, its fan catching the sun
  const wx = 214;
  plant(p, WINDMILL, wx, Math.round(midTop(wx)) + 1, { ...MILL, O: "#f0b070" });
  // water tank beside it
  const tx = 226, tt = Math.round(midTop(tx));
  p.rect(tx, tt - 5, 6, 5, MILL.w);
  p.hline(tx, tt - 5, 6, MILL.l);
  p.vline(tx + 5, tt - 4, 4, MILL.o);
  // a fence line running along the swell
  for (let x = 40; x < 150; x += 9) {
    const b = Math.round(midTop(x)) + 2;
    p.vline(x, b - 4, 5, MILL.o);
    p.px(x + 1, b - 4, MILL.l);
    for (let i = 1; i < 9; i++) p.px(x + i, Math.round(midTop(x + i)) - 1, "#8a6a42");
  }
};

// ---------------------------------------------------------------- prairie floor
const trackTop = (x: number): number => FLOOR_Y - 6 + 1.5 * wave(x, 2, 0.9) + wave(x, 7, 2.6);
const trackBot = (x: number): number => FLOOR_Y + 6 + 1.8 * wave(x, 3, 1.7) + wave(x, 5, 0.3);

const onTrack = (x: number, y: number, w: number): boolean => {
  for (let i = -1; i <= w; i++) if (y >= trackTop(x + i) - 2 && y <= trackBot(x + i) + 3) return true;
  return false;
};

const tuftPal = (y: number): Palette => {
  const i = bandAt(GSTOP, y);
  const deep = [...GROUND, "#7a6430", "#6a562a", "#5c4a24"];
  let l = "#c8a858";
  if (i <= 1) l = "#f0dc98";
  else if (i <= 3) l = "#e8d088";
  return { l, d: deep[i + 2] };
};

const paintGround = (p: PixelPainter): void => {
  strata(p, GSTOP.map((y, i) => [y, GROUND[i]] as [number, string]), p.h, 2);
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(GSTOP[0] - 1 - 0.8 * wave(x, 11, 0.7) - 0.6 * wave(x, 17, 2));
    p.vline(x, e, GSTOP[0] - e, GROUND[0]);
    p.px(x, e, "#ecd896");
  }
  // perspective streaks of wind-combed grass
  p.reseed(511);
  for (let y = 117; y < p.h; y += 2 + Math.floor((y - 112) / 14)) {
    const depth = (y - 112) / 68;
    const n = Math.round(14 + depth * 8);
    const len = 2 + Math.round(depth * 6);
    const band = bandAt(GSTOP, y);
    const dark = GROUND[Math.min(GROUND.length - 1, band + 1)];
    for (let k = 0; k < n; k++) {
      const x = Math.floor(p.rand() * TILE_W);
      p.hline(x, y, len, dark);
      if (depth > 0.35) p.hline(x + 1, y - 1, Math.max(1, len - 3), dark);
    }
  }
  // the wagon trail
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(trackTop(x));
    const b = Math.round(trackBot(x));
    p.vline(x, t, b - t, DIRT.base);
    p.px(x, t - 1, DIRT.lip);
    p.px(x, t, DIRT.deep);
    p.px(x, t + 1, DIRT.shade);
    p.px(x, b - 1, DIRT.light);
    p.px(x, b, DIRT.lip);
  }
  // two wheel ruts, a strip of grass down the middle
  for (let x = 0; x < TILE_W; x++) {
    const t = trackTop(x), b = trackBot(x);
    for (const f of [0.3, 0.72]) {
      if (wave(x, 9, f * 7) + 0.5 * wave(x, 23, f) > 0.4) continue;
      const y = Math.round(t + (b - t) * f);
      p.px(x, y, DIRT.shade);
      p.px(x, y + 1, DIRT.light);
    }
    if (wave(x, 13, 1.2) + 0.6 * wave(x, 31, 0.4) > 0.5) p.px(x, Math.round(t + (b - t) * 0.5), "#a08a44");
  }
  p.reseed(77);
  for (let k = 0; k < 12; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = Math.round(trackTop(x)) + 3 + Math.floor(p.rand() * 7);
    if (y >= Math.round(trackBot(x)) - 2) continue;
    p.px(x, y, DIRT.pebble);
    p.px(x + 1, y, DIRT.pebble);
    p.px(x, y + 1, DIRT.pebbleShade);
    p.px(x + 1, y + 1, DIRT.pebbleShade);
  }
  // dry grass clumps, bigger lower down; never on the trail
  p.reseed(9191);
  // placed in small drifts of two to four clumps so the field reads as patches, not polka dots
  for (let k = 0; k < 42; k++) {
    const y0 = 118 + Math.floor(Math.pow(p.rand(), 0.8) * 60);
    const x0 = Math.floor(p.rand() * TILE_W);
    const n = 2 + Math.floor(p.rand() * 3);
    for (let i = 0; i < n; i++) {
      const y = y0 + Math.floor(p.rand() * 4) - 1;
      const x = x0 + i * (3 + Math.floor((y - 110) / 12)) + Math.floor(p.rand() * 2);
      const g = tuftFor(y);
      if (onTrack(x, y, g[0].length)) continue;
      plant(p, g, x, y, tuftPal(y));
    }
  }
  // grass overhanging the near edge of the trail
  p.reseed(613);
  const FRINGE: Grid[] = [["l.l", "dld"], ["..l..", "l.l.l", "dldld"], ["l", "d"]];
  for (let x = 0; x < TILE_W; x += 4 + Math.floor(p.rand() * 7)) {
    const g = FRINGE[Math.floor(p.rand() * FRINGE.length)];
    p.stamp(g, x, Math.round(trackBot(x)) - g.length + 1, { l: "#e8d088", d: GROUND[3] });
  }
  // a little bleached skull by the trail
  plant(p, [".hhh.", "hsshh", "hohoh", ".hhh.", ".h.h."], 72, Math.round(trackBot(72)) + 9, { h: "#efe6d2", s: "#ffffff", o: "#6a5030" });
  // prairie flowers: paintbrush and asters in small clusters
  p.reseed(58);
  const kinds = ["o", "p", "y"];
  for (let c = 0; c < 12; c++) {
    const cx = Math.floor(p.rand() * TILE_W);
    const cy = 122 + Math.floor(p.rand() * 46);
    const kind = kinds[c % kinds.length];
    for (let k = 0; k < 4; k++) {
      const x = cx + Math.floor(p.rand() * 14) - 7;
      const y = cy + Math.floor(p.rand() * 5) - 2;
      if (onTrack(x, y, 3)) continue;
      if (y > 146) {
        p.px(x, y + 1, FLOWER.s);
        p.px(x, y + 2, FLOWER.s);
        p.px(x, y, FLOWER[kind]);
        p.px(x, y - 1, FLOWER[kind]);
      } else p.px(x, y, FLOWER[kind]);
    }
  }
};

// ---------------------------------------------------------------- foreground
const FRONT_TUFT: Grid = [
  "......d.........",
  "..d...d.....d...",
  "..dd..dd...dd..d",
  "d..d.ddd..ddd.dd",
  "dd.ddddd.dddddd.",
  "dddddddddddddddd",
  "dddddddddddddddd",
];

const paintFront = (p: PixelPainter): void => {
  const pal = { d: "#5a4222" };
  for (const x of [8, 64, 140, 210, 276]) p.stamp(FRONT_TUFT, x, p.h - FRONT_TUFT.length, pal);
  for (let x = 0; x < TILE_W; x++) {
    let h = 2;
    if ((x * 7) % 5 === 0) h += 2;
    else if ((x * 3) % 4 === 0) h += 1;
    p.vline(x, p.h - h, h, "#5a4222");
  }
  // a weathered post in the near corner
  fence(p, 296, 296, p.h + 4, 9, "#3e2a1a", "#6a4a2e", "#3e2a1a");
};

const field: Battlefield = {
  terrain: "flat",
  ambient: "pollen",
  ambientColors: ["#fff0c0", "#f4d890", "#e8b878"],
  layers: [
    { parallax: 0.05, paint: (p) => paintDuskSky(p) },
    { parallax: 0.08, drift: 2, paint: paintStreaks },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.5, paint: paintMid },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
