import type { Battlefield } from "../../field";
import type { Palette } from "../../palette";
import { FLOOR_Y, TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { bandAt, paintDuskSky, paintMesas, paintStreaks, plant, strata, wdx, type Mesa } from "./common";

/**
 * Frontier "Sunken Realm": a slow, muddy creek bottom at dusk. The sunset glares off a wide
 * brown creek lined with dead cottonwood snags and dry reeds; the fighters stand on a cracked
 * mud bar with puddles that hold the sky, a half-sunk wagon wheel and drifted deadwood.
 */

// ---------------------------------------------------------------- palettes
const HAZE = { lit: "#b8685a", shade: "#a05a56", band: "#8e5052", rim: "#e6966c" };
const TREES = { far: "#7a4a44", farLit: "#a0604c" };
const SNAG: Palette = { o: "#3a2a1e", b: "#5a4430", l: "#c08050" };
const WATER = { deep: "#5a4030", mid: "#7a5a3a", sky: "#b0603a", glint: "#f0b060", glint2: "#ffe0a0", bank: "#4a3a24", bankLit: "#9a8456" };
const GROUND = ["#9a8a5c", "#8a7a52", "#7e6e4a", "#706040", "#5e5038", "#504430"];
const GSTOP = [119, 123, 128, 135, 150, 165];
const MUD = { crack: "#4a3c28", crackLit: "#aa9a6a", wet: "#6a5a3c", wetLit: "#a69468" };
const REED: Palette = { l: "#c8b070", m: "#b8a060", d: "#8a7a40", h: "#6a4a2a" };

// ---------------------------------------------------------------- far: mesas and a cottonwood line
const FAR_MESAS: Mesa[] = [
  { x: 30, y: 86, w: 14, cap: 9, slope: 0.6 },
  { x: 150, y: 82, w: 20, cap: 11, slope: 0.55 },
  { x: 276, y: 90, w: 10, cap: 7, slope: 0.6 },
];

const paintFar = (p: PixelPainter): void => {
  paintMesas(p, FAR_MESAS, HAZE, 110);
  // a soft line of far cottonwoods along the creek: round dark crowns, rim-lit on the right
  const top = (x: number): number => 102 - 3 * Math.abs(wave(x, 7, 0.4)) - 2 * Math.abs(wave(x, 17, 1.3));
  p.ridge(top, TREES.far, 110);
  for (let x = 0; x < TILE_W; x++) if (top(x + 1) > top(x) + 0.3) p.px(x, Math.round(top(x)), TREES.farLit);
};

// ---------------------------------------------------------------- mid: the creek and its snags
const WATER_TOP = 101;
const WATER_BOT = 120;

/** A bare, leaning cottonwood snag: trunk, forked limbs and broken stubs. */
const SNAG_G: Grid = [
  "l.........o....",
  ".o.......o.....",
  "..o..o..o......",
  "...o.o.o...o...",
  "....oo.o..o....",
  ".....oboo.o....",
  "......obbo.....",
  "......obo......",
  "......oblo.....",
  ".....obblo.....",
  ".....obblo.....",
  ".....obblo.....",
  "....obbblo.....",
  "....obbbllo....",
  "...oobbbblo....",
  "..o.obbbblooo..",
];

const paintCreek = (p: PixelPainter): void => {
  // far bank with sedge
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(WATER_TOP - 2 - wave(x, 5, 1.1) - 0.8 * wave(x, 13, 0.2));
    p.vline(x, t, WATER_TOP - t, WATER.bank);
    if (wave(x, 5, 1.1) > 0) p.px(x, t, WATER.bankLit);
  }
  // water: deep brown, with bands of reflected sky toward the near bank
  strata(p, [[WATER_TOP, WATER.deep], [106, WATER.mid], [112, WATER.sky]], WATER_BOT, 2);
  // ripple lines
  for (let y = WATER_TOP + 1; y < WATER_BOT; y += 2)
    for (let x = 0; x < TILE_W; x++) {
      const r = wave(x, 9 + y, y * 0.7) + 0.5 * wave(x, 31, y);
      if (r > 1.05) p.hline(x, y, 2, y < 110 ? WATER.sky : WATER.glint);
    }
  // the sun's glare: broken horizontal dashes, wider toward the near bank
  for (let y = WATER_TOP + 1; y < WATER_BOT; y += 2) {
    const half = 2 + Math.round((y - WATER_TOP) * 0.9);
    const shift = ((y * 5) % 7) - 3;
    p.hline(224 - half + shift, y, half, WATER.glint);
    p.hline(224 + 2 + shift, y, Math.round(half * 0.7), WATER.glint);
    p.hline(224 - 1, y, 3, WATER.glint2);
  }
  // snags standing in the shallows, with dark reflections
  for (const [x, flip] of [[46, 0], [168, 1], [292, 0]] as [number, number][]) {
    const g = flip ? SNAG_G.map((r) => r.split("").reverse().join("")) : SNAG_G;
    const pal = flip ? { ...SNAG, l: SNAG.o } : SNAG;
    plant(p, g, x, WATER_TOP + 6, pal);
    for (let j = 1; j < 5; j += 1) if (j % 2) p.hline(x - 2 + (j % 3), WATER_TOP + 6 + j, 3, WATER.bank);
  }
  // near-bank lip
  for (let x = 0; x < TILE_W; x++) p.px(x, WATER_BOT - 1, wdx(x, 224) * wdx(x, 224) < 400 ? WATER.glint : WATER.mid);
};

// ---------------------------------------------------------------- mud bar
const barTop = (x: number): number => FLOOR_Y - 8 + 1.5 * wave(x, 2, 0.4) + wave(x, 5, 2.2);
const barBot = (x: number): number => FLOOR_Y + 7 + 1.5 * wave(x, 3, 1.1) + wave(x, 7, 0.2);

/** A wagon wheel sunk to its hub: a 2px rim, spokes and a hub, lit from the right. */
const wheel = (p: PixelPainter, cx: number, cy: number, r: number): void => {
  const RIM = "#8a6a42", LIT = "#c09a62", DARK = "#3a2a1a";
  for (let y = -r - 1; y <= 0; y++)
    for (let x = -r - 1; x <= r + 1; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d <= r + 1.4 && d > r - 0.6) p.px(cx + x, cy + y, d > r + 0.4 ? DARK : RIM);
      if (d <= r + 0.4 && d > r - 0.6 && x > 0 && y < -r * 0.3) p.px(cx + x, cy + y, LIT);
    }
  for (let k = 1; k < 6; k++) {
    const a = Math.PI + (k * Math.PI) / 6;
    p.line(cx, cy, cx + Math.round(Math.cos(a) * (r - 1)), cy + Math.round(Math.sin(a) * (r - 1)), RIM);
  }
  p.rect(cx - 1, cy - 2, 3, 2, DARK);
  p.px(cx + 1, cy - 2, LIT);
};

/** A clump of dry cattails: 'h' seed heads, 'l' lit stems, 'm' stems, 'd' dark base. */
const reeds = (h: number, seed: number): Grid => {
  const W = 11;
  const rows: string[][] = [];
  for (let j = 0; j < h; j++) rows.push(new Array(W).fill("."));
  for (let k = 0; k < 6; k++) {
    const x0 = 1 + ((k * 3 + seed) % 9);
    const top = Math.round(((k * 5 + seed * 3) % 7) * h * 0.07);
    const lean = k % 2 ? 1 : -1;
    for (let j = top; j < h; j++) {
      const x = x0 + (j - top < h * 0.3 ? lean : 0);
      if (x < 0 || x >= W) continue;
      rows[j][x] = k % 3 === 0 ? "l" : "m";
    }
    if (k % 2 === 0 && top + 2 < h) {
      const x = x0 + lean;
      if (x >= 0 && x < W) [rows[top][x], rows[top + 1][x], rows[top + 2][x]] = ["m", "h", "h"];
    }
  }
  for (let i = 2; i < W - 2; i++) rows[h - 1][i] = "d";
  for (let i = 3; i < W - 3; i++) rows[h - 2][i] = "d";
  return rows.map((r) => r.join(""));
};

const paintGround = (p: PixelPainter): void => {
  // the near bank of the creek grades into the mud flats
  strata(p, GSTOP.map((y, i) => [y, GROUND[i]] as [number, string]), p.h, 2);
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(GSTOP[0] - 1 - wave(x, 9, 0.3) - 0.6 * wave(x, 23, 1.6));
    p.vline(x, e, GSTOP[0] - e, GROUND[0]);
    p.px(x, e, "#c8b888");
  }
  // the bar the fighters stand on: dry, pale, cracked mud
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(barTop(x)), b = Math.round(barBot(x));
    p.vline(x, t, b - t, "#a69468");
    p.px(x, t - 1, GROUND[3]);
    p.px(x, t, "#b8a678");
    p.px(x, b - 1, GROUND[2]);
    p.px(x, b, GROUND[4]);
  }
  // polygon cracks on the bar: short runs that turn at right-ish angles
  p.reseed(4711);
  for (let k = 0; k < 20; k++) {
    let x = Math.floor(p.rand() * TILE_W);
    let y = Math.round(barTop(x)) + 2 + Math.floor(p.rand() * 9);
    for (let s = 0; s < 4; s++) {
      const len = 2 + Math.floor(p.rand() * 4);
      const horiz = s % 2 === 0;
      for (let i = 0; i < len; i++) {
        if (y <= barTop(x) + 1 || y >= barBot(x) - 1) break;
        p.px(x, y, MUD.crack);
        p.px(x, y + 1, MUD.crackLit);
        if (horiz) x++;
        else y += p.rand() > 0.5 ? 1 : -1;
      }
    }
  }
  // wet mud streaks below the bar
  p.reseed(66);
  for (let y = 122; y < p.h; y += 4 + Math.floor((y - 112) / 12)) {
    const depth = (y - 112) / 68;
    for (let k = 0; k < 6 + depth * 6; k++) {
      const x = Math.floor(p.rand() * TILE_W);
      if (y > barTop(x) - 2 && y < barBot(x) + 2) continue;
      const len = 3 + Math.round(depth * 8);
      p.hline(x, y, len, GROUND[Math.min(GROUND.length - 1, bandAt(GSTOP, y) + 1)]);
    }
  }
  // puddles holding the sky
  const PUDDLES: [number, number, number][] = [[60, 126, 10], [270, 124, 8], [110, 158, 18], [228, 166, 22], [10, 170, 12]];
  for (const [x, y, rx] of PUDDLES) {
    const ry = Math.max(1, Math.round(rx / 7));
    p.ellipse(x, y, rx + 1, ry + 1, MUD.wet);
    p.ellipse(x, y, rx, ry, "#c87a44");
    p.hline(x - rx + 2, y - ry, rx, "#e8a050");
    p.hline(x - Math.round(rx / 2), y, Math.round(rx * 0.6), "#f4c070");
    p.hline(x - rx, y + ry + 1, rx * 2, MUD.wetLit);
  }
  // reed clumps along the water's edge and in the flats
  for (const [x, y] of [[20, 124], [94, 121], [150, 123], [204, 120], [306, 122], [42, 166], [180, 176], [292, 172]] as [number, number][])
    plant(p, reeds(y > 150 ? 20 : 12, x % 5), x, y, REED);
  // a half-sunk wagon wheel and a drifted branch, away from the fighters
  wheel(p, 262, 162, 8);
  p.hline(252, 162, 21, GROUND[5]);
  p.line(70, 152, 92, 149, "#5a4430");
  p.line(70, 153, 92, 150, "#3a2a1e");
  p.line(84, 150, 88, 146, "#5a4430");
};

// ---------------------------------------------------------------- foreground
const paintFront = (p: PixelPainter): void => {
  const d = "#2e2416";
  // tall reed stands rising from the bottom corners
  for (let x = 0; x < TILE_W; x++) {
    const tall = Math.max(0, 22 * Math.max(0, wave(x, 2, 0.2)) - 8);
    let h = 2 + Math.round(1.5 * Math.abs(wave(x, 11, 0.7)));
    if (tall > 0 && x % 3 === 0) h += Math.round(tall + (x % 7));
    p.vline(x, p.h - h, h, d);
    if (h > 12 && x % 9 === 0) p.rect(x - 1, p.h - h - 3, 3, 4, "#4a3a22");
  }
};

const field: Battlefield = {
  terrain: "swamp",
  ambient: "fireflies",
  ambientColors: ["#ffe080", "#f8c860", "#fff0b0"],
  layers: [
    { parallax: 0.05, paint: (p) => paintDuskSky(p, 224, 90, 13) },
    { parallax: 0.08, drift: 1.5, paint: paintStreaks },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.5, paint: paintCreek },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
