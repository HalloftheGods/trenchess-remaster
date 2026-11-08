import type { Battlefield } from "../../field";
import type { Palette } from "../../palette";
import { FLOOR_Y, TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { bandAt, paintDuskSky, paintMesas, paintStreaks, plant, saguaro, strata, type Mesa } from "./common";

/**
 * Frontier "Endless Sands": bone-dry sand flats. Low mesas fade into the dusk, sand swells
 * stand against the glow with saguaros on their crests, and the fighters meet on wind-rippled
 * pale sand littered with bleached bones: a longhorn skull, a half-buried rib cage, scattered
 * vertebrae, prickly pear and a tumbleweed.
 */

// ---------------------------------------------------------------- palettes
const HAZE = { lit: "#d08a64", shade: "#ba7a60", band: "#a86e5c", rim: "#f0b07a" };
const DUNE = { far: "#c89060", farRim: "#eab47a", lit: "#e0b070", shade: "#b88450", rim: "#f6d090", deep: "#a07040" };
const CACTUS_FAR: Palette = { o: "#5a4a2a", d: "#6a5630", m: "#7a6234", l: "#c8a050" };
const CACTUS: Palette = { o: "#2e3818", d: "#46562a", m: "#5e7034", l: "#9aa04a" };
const GROUND = ["#f0d098", "#ecc890", "#e2bc82", "#d8b074", "#c8a060", "#b88e52"];
const GSTOP = [116, 120, 126, 134, 150, 165];
const BONE: Palette = { o: "#7a5a38", s: "#c8b89a", b: "#efe6d2", w: "#fffaf0", h: "#3a2a1a", k: "#b09070" };
const PEAR: Palette = { o: "#2e3818", d: "#4a5e2c", m: "#6a7e38", l: "#94a44a", f: "#e05a6a" };

// ---------------------------------------------------------------- far mesas
const FAR_MESAS: Mesa[] = [
  { x: 60, y: 90, w: 22, cap: 7, slope: 0.4 },
  { x: 168, y: 94, w: 10, cap: 5, slope: 0.5 },
  { x: 260, y: 86, w: 16, cap: 9, slope: 0.45 },
];

const paintFar = (p: PixelPainter): void => {
  paintMesas(p, FAR_MESAS, HAZE, 112);
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(104 + 1.2 * wave(x, 3, 0.4) + 0.8 * wave(x, 8, 1.7));
    p.vline(x, t, 112 - t, "#e4a070");
    p.px(x, t, "#f4bc84");
  }
};

// ---------------------------------------------------------------- dunes and saguaros
const farDune = (x: number): number => 104 - 4 * wave(x, 2, 0.6) - 2 * wave(x, 5, 2.2);
const nearDune = (x: number): number => 110 - 4 * wave(x, 3, 1.9) - 1.5 * wave(x, 7, 0.4);

/** Paints a dune ridge lit on its sunward (right-facing, falling) slope. */
const dune = (p: PixelPainter, top: (x: number) => number, lit: string, shade: string, rim: string, bottom: number): void => {
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(top(x));
    const slope = top(x + 1) - top(x - 1);
    p.vline(x, t, bottom - t, slope > 0 ? shade : lit);
    p.px(x, t, slope > 0 ? shade : rim);
    // the crest's lee shadow spills a little down the lit side
    if (slope > 0.6) p.vline(x, t, 3, shade);
  }
};

const paintDunes = (p: PixelPainter): void => {
  dune(p, farDune, DUNE.far, DUNE.deep, DUNE.farRim, 124);
  for (const [x, h, arms] of [[30, 13, 3], [204, 10, 1], [282, 12, 2]] as [number, number, number][])
    plant(p, saguaro(h, arms), x, Math.round(farDune(x)) + 1, CACTUS_FAR);
  dune(p, nearDune, DUNE.lit, DUNE.shade, DUNE.rim, 124);
  for (const [x, h, arms] of [[96, 22, 3], [150, 16, 2], [246, 19, 1]] as [number, number, number][]) {
    const b = Math.round(nearDune(x)) + 2;
    p.hline(x - 1, b + 1, 9, DUNE.shade);
    plant(p, saguaro(h, arms), x, b, CACTUS);
  }
};

// ---------------------------------------------------------------- sand flats and bones
const SKULL: Grid = [
  "oo...........oo",
  "obo.........obo",
  ".obbo.ooo.obbo.",
  "..obbobwbobbo..",
  "...obbwwbbbo...",
  "....ohbbho.....",
  "....obbbbo.....",
  ".....okko......",
  "......oo.......",
];

const VERTEBRA: Grid = [".o.", "obo", ".s."];

const PEAR_G: Grid = [
  "..f...f...",
  ".olo.oml..",
  "oollooddo.",
  "omldoomdo.",
  ".oddmldo..",
  "..omddo...",
  "...odo....",
];

const TUMBLEWEED: Grid = [
  "..k.kk.k..",
  ".kkokkok..",
  "kko.ko.okk",
  "k.okkkko.k",
  "kko.ok.okk",
  ".kkokkokk.",
  "..kk.kk...",
];

/** A rib cage half sunk in the sand: arched ribs off a spine, near ones larger. */
const ribs = (p: PixelPainter, x: number, y: number, n: number, r: number): void => {
  p.hline(x - 1, y - r, n * 4 + 2, BONE.b);
  p.hline(x - 1, y - r - 1, n * 4 + 2, BONE.o);
  for (let i = 0; i < n; i++) {
    const cx = x + i * 4;
    for (let j = 0; j <= r; j++) {
      const off = Math.round(Math.sqrt(Math.max(0, r * r - (r - j) * (r - j))) * 0.5);
      p.px(cx + off, y - r + j, BONE.b);
      p.px(cx + off + 1, y - r + j, j > r / 2 ? BONE.s : BONE.o);
    }
  }
  p.hline(x - 2, y + 1, n * 4 + 4, GROUND[4]);
};

const paintGround = (p: PixelPainter): void => {
  strata(p, GSTOP.map((y, i) => [y, GROUND[i]] as [number, string]), p.h, 2);
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(GSTOP[0] - 1 - wave(x, 6, 0.9) - 0.6 * wave(x, 15, 0.2));
    p.vline(x, e, GSTOP[0] - e, GROUND[0]);
    p.px(x, e, "#f8e4b8");
  }
  // wind ripples: long gentle wave lines, a shade line with a lit lip under it
  for (let y = 121; y < p.h; y += 5 + Math.floor((y - 112) / 8)) {
    const gi = bandAt(GSTOP, y);
    const shade = GROUND[Math.min(GROUND.length - 1, gi + 1)];
    for (let x = 0; x < TILE_W; x++) {
      const on = wave(x, 7, y) + 0.6 * wave(x, 17, y * 0.3) > 0.25;
      if (!on) continue;
      const yy = Math.round(y + 1.2 * wave(x, 9, y * 0.5));
      // keep the strip the fighters stand on calm
      if (Math.abs(yy - FLOOR_Y) < 5 && y < 150) continue;
      p.px(x, yy, shade);
      if (y > 145) p.px(x, yy + 1, GROUND[Math.max(0, gi - 2)]);
    }
  }
  // a broad wheel-less drag mark: the floor the fighters stand on is a hard, pale pan
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(FLOOR_Y - 5 + wave(x, 3, 0.4));
    const b = Math.round(FLOOR_Y + 5 + wave(x, 4, 1.4));
    p.vline(x, t, b - t, "#f2d8a6");
    p.px(x, t, GROUND[2]);
    p.px(x, b, GROUND[3]);
  }
  // grit
  p.reseed(4049);
  for (let gy = 124; gy < p.h; gy += 6 + Math.floor((gy - 112) / 10))
    for (let gx = 0; gx < TILE_W; gx += 37) {
      const x = gx + Math.floor(p.rand() * 20);
      const y = gy + Math.floor(p.rand() * 3);
      const gi = bandAt(GSTOP, y);
      p.px(x, y, GROUND[Math.min(GROUND.length - 1, gi + 3)]);
      p.px(x + 1, y, "#fff0d0");
    }
  // bones and desert plants, kept off the fighters' middle
  plant(p, SKULL, 52, 162, BONE);
  p.hline(46, 163, 14, GROUND[5]);
  ribs(p, 226, 166, 5, 7);
  ribs(p, 140, 124, 3, 3);
  for (const [x, y] of [[196, 170], [202, 172], [208, 171], [274, 126], [12, 150]] as [number, number][]) plant(p, VERTEBRA, x, y, BONE);
  plant(p, PEAR_G, 300, 160, PEAR);
  p.hline(296, 161, 10, GROUND[5]);
  plant(p, PEAR_G, 20, 124, PEAR);
  plant(p, TUMBLEWEED, 112, 172, { k: "#a07a48", o: "#6a4e2e" });
  // small stones with a shadow
  for (const [x, y] of [[80, 124], [180, 122], [250, 128], [160, 176], [90, 170]] as [number, number][]) {
    p.px(x, y, "#fff0d0");
    p.px(x + 1, y, "#d0a868");
    p.px(x, y + 1, "#a07a48");
    p.hline(x + 1, y + 1, 2, GROUND[5]);
  }
};

// ---------------------------------------------------------------- foreground
const paintFront = (p: PixelPainter): void => {
  const d = "#7a5634";
  for (let x = 0; x < TILE_W; x++) {
    const h = Math.round(2 + 2 * wave(x, 3, 0.6) + wave(x, 8, 1.2));
    if (h > 0) p.vline(x, p.h - h, h, d);
  }
  // a big saguaro at the tile's edge, cut off by the frame
  const big = saguaro(30, 3).flatMap((r) => {
    const w = r.replace(/./g, (c) => c + c);
    return [w, w];
  });
  p.stamp(big, 280, p.h - 46, { o: "#141808", d: "#1e2410", m: "#283018", l: "#6a5a2a" });
};

const field: Battlefield = {
  terrain: "desert",
  ambient: "sand",
  ambientColors: ["#f8e4b8", "#ecc890", "#ffffff"],
  layers: [
    { parallax: 0.05, paint: (p) => paintDuskSky(p, 112, 88, 14) },
    { parallax: 0.08, drift: 2.5, paint: paintStreaks },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.5, paint: paintDunes },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
