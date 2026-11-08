import type { Battlefield } from "../../field";
import type { Palette } from "../../palette";
import { FLOOR_Y, TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { bandAt, paintDuskSky, paintMesas, paintStreaks, pine, plant, strata, type Mesa } from "./common";

/**
 * Frontier "Whispering Woods": a ponderosa pine stand at dusk. The low sun burns through gaps
 * between backlit pine ridges, nearer pines catch a hot rim on their sunward side, and the
 * fighters meet in a needle-strewn clearing among stumps, a fallen log and pine cones.
 */

// ---------------------------------------------------------------- palettes
const HAZE = { lit: "#b0645a", shade: "#9a5654", band: "#8a4c50", rim: "#e0906a" };
const RIDGE1: Palette = { a: "#a0604e", b: "#7e4a46", c: "#704244", t: "#704244" };
const RIDGE2: Palette = { a: "#a8683e", b: "#5a3e34", c: "#4c3630", t: "#4c3630" };
const PINES: Palette = { a: "#d89a4a", b: "#3e4e2a", c: "#2e3a22", t: "#3a2618" };
const GROUND = ["#86984a", "#7a8e48", "#6e8240", "#627438", "#56683a", "#485a30"];
const GSTOP = [116, 121, 127, 135, 152, 166];
const CLEAR = { lip: "#4a3a1e", deep: "#6a4e2e", base: "#8a6a3a", light: "#a6844a", needle: "#b8944e", needleDark: "#5a4a20" };
const STUMP: Palette = { o: "#2e1e12", r: "#a07a4a", R: "#c49a62", b: "#6a4a2a", d: "#4a3220" };

// ---------------------------------------------------------------- far: mesas and backlit ridges
const FAR_MESAS: Mesa[] = [
  { x: 70, y: 84, w: 18, cap: 10, slope: 0.6 },
  { x: 250, y: 80, w: 14, cap: 11, slope: 0.6 },
];

const ridgeTop = (x: number): number => 100 - 4 * wave(x, 2, 0.3) - 2 * wave(x, 5, 1.9);

const paintFar = (p: PixelPainter): void => {
  paintMesas(p, FAR_MESAS, HAZE, 112);
  // first ridge: a hazy hill crowded with small pines, backlit
  p.ridge(ridgeTop, RIDGE1.b, 116);
  p.reseed(31);
  for (let x = 0; x < TILE_W; x += 3 + Math.floor(p.rand() * 4)) {
    const h = 8 + Math.floor(p.rand() * 7);
    const g = pine(h, Math.round(h * 0.5), x);
    p.stamp(g, x - Math.floor(g[0].length / 2), Math.round(ridgeTop(x)) + 2 - g.length, RIDGE1);
  }
};

/** A wavy band of dark pines with a gap left open toward the sun. */
const nearTop = (x: number): number => 108 - 3 * wave(x, 3, 1.2) - 1.5 * wave(x, 7, 0.5);

const paintRidge = (p: PixelPainter): void => {
  p.ridge(nearTop, RIDGE2.b, 120);
  p.reseed(57);
  for (let x = 0; x < TILE_W; x += 4 + Math.floor(p.rand() * 5)) {
    // keep the sun's gap open
    if (Math.abs(x - 224) < 22) continue;
    const h = 14 + Math.floor(p.rand() * 12);
    const g = pine(h, Math.round(h * 0.46), x + 1);
    p.stamp(g, x - Math.floor(g[0].length / 2), Math.round(nearTop(x)) + 3 - g.length, RIDGE2);
  }
};

// ---------------------------------------------------------------- mid: the pine stand
const STAND: [number, number][] = [
  [8, 58], [30, 44], [52, 66], [88, 38], [110, 50], [150, 34], [176, 46], [272, 54], [296, 40],
];

const paintStand = (p: PixelPainter): void => {
  const base = 120;
  // undergrowth band the trunks rise from
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(base - 4 - 1.5 * wave(x, 9, 0.6) - wave(x, 21, 1.4));
    p.vline(x, t, 124 - t, PINES.c);
    if (wave(x, 9, 0.6) > 0.3) p.px(x, t, PINES.b);
  }
  STAND.forEach(([x, h], i) => {
    const g = pine(h, Math.round(h * 0.42), i * 7);
    const trunkH = Math.round(h * 0.18);
    p.rect(x - 1, base - trunkH - 2, 3, trunkH + 2, PINES.t);
    p.vline(x + 1, base - trunkH - 2, trunkH + 2, "#6a4428");
    p.stamp(g, x - Math.floor(g[0].length / 2), base - trunkH - g.length + 3, PINES);
  });
};

// ---------------------------------------------------------------- needle-strewn clearing
const clearTop = (x: number): number => FLOOR_Y - 7 + 1.5 * wave(x, 2, 2.1) + wave(x, 6, 0.4);
const clearBot = (x: number): number => FLOOR_Y + 7 + 2 * wave(x, 3, 0.8) + wave(x, 7, 2.6);

const LOG: Grid = [
  "..oooooooooooooooooooo..",
  ".oRrrrbbrrrrbrrrrbbrrro.",
  "oRrRrbbdbbbbdbbbbdbbbbbo",
  "orRrbdbbbbdbbbbbdbbbbdbo",
  ".oRrdbbdbbbbbdbbbbbdbdo.",
  "..oooooooooooooooooooo..",
];

const STUMP_G: Grid = [
  ".oooooo.",
  "oRRrRRro",
  "obRRrrdo",
  "obbbbddo",
  "obbbbddo",
  "obbbbbddo",
];

const CONE: Grid = [".r.", "rbr", ".b."];

const paintGround = (p: PixelPainter): void => {
  strata(p, GSTOP.map((y, i) => [y, GROUND[i]] as [number, string]), p.h, 2);
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(GSTOP[0] - 1 - 0.8 * wave(x, 11, 0.7) - 0.6 * wave(x, 17, 2));
    p.vline(x, e, GSTOP[0] - e, GROUND[0]);
    p.px(x, e, "#a0aa58");
  }
  // low-sun streaks: long warm light shafts lying across the floor between tree shadows
  for (let y = GSTOP[0]; y < p.h; y++)
    for (let x = 0; x < TILE_W; x++) {
      const s = wave(x - y * 1.6, 5, 0.2) + 0.25 * wave(x, 13, y * 0.02);
      if (s < -0.55) p.px(x, y, GROUND[Math.min(GROUND.length - 1, bandAt(GSTOP, y) + 1)]);
      else if (s > 0.75 && y < 150) p.px(x, y, GROUND[Math.max(0, bandAt(GSTOP, y) - 1)]);
    }
  // the clearing: bare needle-covered earth
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(clearTop(x));
    const b = Math.round(clearBot(x));
    p.vline(x, t, b - t, CLEAR.base);
    p.px(x, t - 1, CLEAR.lip);
    p.px(x, t, CLEAR.deep);
    p.px(x, b - 1, CLEAR.light);
    p.px(x, b, CLEAR.lip);
  }
  // needles: short diagonal 2px strokes, light and dark, on a loose grid
  p.reseed(1234);
  for (let y = 118; y < p.h; y += 3) {
    const depth = (y - 112) / 68;
    const n = Math.round(10 + depth * 14);
    for (let k = 0; k < n; k++) {
      const x = Math.floor(p.rand() * TILE_W);
      const onClear = y > clearTop(x) && y < clearBot(x) - 1;
      const c = onClear ? CLEAR.needle : "#8a6a2a";
      const d = onClear ? CLEAR.deep : "#5a4a20";
      p.px(x, y, k % 3 === 0 ? d : c);
      if (depth > 0.3) p.px(x + (k % 2 ? 1 : -1), y + 1, k % 3 === 0 ? d : c);
    }
  }
  // ferns and low brush, off the clearing
  p.reseed(88);
  const FERN: Grid = ["l...l", ".l.l.", "l.d.l", ".ddd."];
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 120 + Math.floor(Math.pow(p.rand(), 0.8) * 58);
    if (y > clearTop(x) - 3 && y < clearBot(x) + 5) continue;
    const pal = { l: y < 140 ? "#a6b05a" : "#8a9a48", d: GROUND[Math.min(GROUND.length - 1, bandAt(GSTOP, y) + 2)] };
    plant(p, y < 130 ? ["l.l", "ddd"] : FERN, x, y, pal);
  }
  // cones on the clearing edge
  for (const x of [34, 118, 196, 250, 300]) plant(p, CONE, x, Math.round(clearBot(x)) - 2, { r: "#8a5a2e", b: "#5a3a1e" });
  // stumps and a fallen log, kept clear of the fighters' centre
  plant(p, STUMP_G, 22, 128, STUMP);
  p.hline(18, 129, 10, "#485a30");
  plant(p, LOG, 248, 164, STUMP);
  p.hline(238, 165, 24, GROUND[5]);
  plant(p, STUMP_G, 140, 170, STUMP);
};

// ---------------------------------------------------------------- foreground
const paintFront = (p: PixelPainter): void => {
  const dark = "#1e2414";
  const bark = "#24180e";
  // two near trunks at the tile edges, cut off by the frame
  p.rect(300, 0, 13, p.h, bark);
  p.vline(300, 0, p.h, "#140c06");
  p.vline(312, 0, p.h, "#a8643a");
  p.vline(311, 0, p.h, "#5a3a22");
  // bark plates: short staggered ridges
  for (let y = 2; y < p.h; y += 5)
    for (let i = 0; i < 2; i++) p.hline(302 + i * 5 + (Math.floor(y / 5) % 2) * 2, y, 3, "#3a2616");
  // a bough hanging into the top corner
  for (let j = 0; j < 22; j++) {
    const half = Math.round(18 - j * 0.7 + 2 * wave(j * 13, 3, 0.4));
    p.hline(300 - half, j, half * 2, dark);
  }
  // a fringe of dark ferns along the bottom
  for (let x = 0; x < TILE_W; x++) {
    let h = 2 + Math.round(1.5 + 1.5 * wave(x, 9, 0.6));
    if ((x * 5) % 7 === 0) h += 2;
    p.vline(x, p.h - h, h, dark);
  }
};

const field: Battlefield = {
  terrain: "forest",
  ambient: "leaves",
  ambientColors: ["#a8843a", "#8a6a2a", "#c09a4a"],
  layers: [
    { parallax: 0.05, paint: (p) => paintDuskSky(p, 224, 84, 12) },
    { parallax: 0.08, drift: 1.5, paint: paintStreaks },
    { parallax: 0.18, paint: paintFar },
    { parallax: 0.32, paint: paintRidge },
    { parallax: 0.6, paint: paintStand },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
