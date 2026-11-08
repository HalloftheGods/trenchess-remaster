import type { Battlefield } from "../field";
import { FLOOR_Y, TILE_W, wave, type PixelPainter } from "../painter";
import type { Grid } from "../sheet";
import type { Palette } from "../palette";

/**
 * "Open Ground": bright late-morning plains. Blue sky with puffy cumulus and a pale sun,
 * distant blue-green hills with a castle, nearer leafy hills, and a meadow with a worn track
 * the fighters stand on.
 */

// ---------------------------------------------------------------- palettes
const SKY = ["#3f6fd2", "#4f80dc", "#6294e6", "#78a8ee", "#92bcf2", "#b0d0f6", "#cae0f8"];
const SUN = { core: "#fffbe6", ring: "#fff0b8", halo: "#a8c8f4" };
const CLOUD = { hi: "#ffffff", mid: "#e8f0fa", lo: "#c6d6ee", deep: "#a6bce0" };
const FAR = { rim: "#b6d4dc", base: "#9ec4d0", shade: "#8cb4c6", haze: "#b8d4e6", castle: "#80a4bc", castleLit: "#94b8cc" };
const BACK = { rim: "#a2cca0", base: "#86b896", shade: "#74a68a", haze: "#9cc4b0" };
const MID = { rim: "#9ccc78", base: "#7cb468", shade: "#68a05e", deep: "#548a52" };
const TREE: Palette = { o: "#3e6e4a", d: "#4f8654", b: "#66a05c", l: "#84bc68", h: "#a2d07a", t: "#6a5440", T: "#4e3e32" };
const GROUND = ["#9ccc5e", "#8cc254", "#7cb64a", "#6ca842", "#5e9a3a", "#508a32"];
const DIRT = { lip: "#4a7e30", deep: "#8a6a40", shade: "#a6824e", base: "#bf9a62", light: "#d6b67c", pebble: "#e6d0a0", pebbleShade: "#9a7a4e" };
const FLOWER: Palette = { w: "#fff8f0", y: "#ffe070", p: "#f4a0c0", v: "#c8a0f0", c: "#e8a030", s: "#4e8a36" };

// ---------------------------------------------------------------- helpers

/** Horizontal strata with explicit seam rows and a short ordered-dither blend at each seam. */
const strata = (p: PixelPainter, stops: [number, string][], bottom: number, blend = 3): void => {
  for (let i = 0; i < stops.length; i++) {
    const [y, c] = stops[i];
    const end = i + 1 < stops.length ? stops[i + 1][0] : bottom;
    p.rect(0, y, p.w, end - y, c);
  }
  for (let i = 1; i < stops.length; i++) {
    const [seam, c] = stops[i];
    for (let b = 0; b < blend; b++) p.dither(0, seam - blend + b, p.w, 1, c, Math.round(((b + 1) / (blend + 1)) * 16));
  }
};

interface Blob {
  x: number;
  y: number;
  r: number;
}

/**
 * Builds a shaded clump grid (a cloud or a tree crown) from overlapping discs. Each pixel is
 * shaded by its own clump's normal against a top-left light, giving clean lumpy clusters; the
 * mask edge becomes the outline char (if any) and a flat cut at `floor` gives cumulus bases.
 */
const clumps = (blobs: Blob[], chars: { hi: string; mid: string; lo: string; edge?: string; cut?: string }, floor = Infinity): Grid => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const b of blobs) {
    x0 = Math.min(x0, b.x - b.r - 1);
    x1 = Math.max(x1, b.x + b.r + 1);
    y0 = Math.min(y0, b.y - b.r - 1);
    y1 = Math.max(y1, Math.min(floor, b.y + b.r + 1));
  }
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const owner: number[][] = [];
  for (let j = 0; j < h; j++) {
    owner.push([]);
    for (let i = 0; i < w; i++) {
      const X = i + x0, Y = j + y0;
      let best = -1;
      if (Y <= floor)
        blobs.forEach((b, k) => {
          const dx = X - b.x, dy = Y - b.y;
          // the front-most (lowest) clump owns the pixel, so lower puffs overlap upper ones
          if (dx * dx + dy * dy <= b.r * b.r + b.r * 0.6 && (best < 0 || b.y > blobs[best].y)) best = k;
        });
      owner[j].push(best);
    }
  }
  const inside = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < w && j < h && owner[j][i] >= 0;
  const out: Grid = [];
  for (let j = 0; j < h; j++) {
    let row = "";
    for (let i = 0; i < w; i++) {
      const k = owner[j][i];
      if (k < 0) {
        row += ".";
        continue;
      }
      const b = blobs[k];
      const X = i + x0, Y = j + y0;
      const edge = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1);
      if (edge && chars.edge && !(Y === floor && chars.cut)) {
        row += chars.edge;
        continue;
      }
      if (Y >= floor - 1 && chars.cut) {
        row += chars.cut;
        continue;
      }
      // distance from a highlight point up and to the left gives round, crescent-shaped light
      const hx = b.x - b.r * 0.4, hy = b.y - b.r * 0.5;
      const d = Math.sqrt((X - hx) ** 2 + (Y - hy) ** 2) / b.r;
      // a back puff just above a front puff sits in its shadow
      const below = j + 1 < h ? owner[j + 1][i] : -1;
      const seam = below >= 0 && below !== k && blobs[below].y > b.y;
      if (seam) row += chars.lo;
      else if (d < 0.78) row += chars.hi;
      else if (d < 1.2) row += chars.mid;
      else row += chars.lo;
    }
    out.push(row);
  }
  return out;
};

/** Stamps a grid by its bottom-centre anchor. */
const plant = (p: PixelPainter, g: Grid, cx: number, by: number, pal: Palette): void => {
  p.stamp(g, Math.round(cx - g[0].length / 2), by - g.length + 1, pal);
};

// ---------------------------------------------------------------- sky
const paintSky = (p: PixelPainter): void => {
  strata(
    p,
    [
      [0, SKY[0]],
      [18, SKY[1]],
      [34, SKY[2]],
      [50, SKY[3]],
      [64, SKY[4]],
      [76, SKY[5]],
      [86, SKY[6]],
    ],
    120,
    2,
  );
  // pale late-morning sun with a soft halo
  const sx = 238, sy = 30;
  p.disc(sx, sy, 12, SUN.halo);
  p.disc(sx, sy, 9, SUN.ring);
  p.disc(sx, sy, 8, SUN.core);
};

const CLOUD_PAL: Palette = { h: CLOUD.hi, m: CLOUD.mid, l: CLOUD.lo, d: CLOUD.deep };

const cloud = (spec: [number, number, number][], floor: number): Grid => {
  const g = clumps(
    spec.map(([x, y, r]) => ({ x, y, r })),
    { hi: "h", mid: "m", lo: "l", cut: "d" },
    floor,
  );
  // soften: lone single-pixel shade islands become the neighbouring tone
  return g;
};

const CLOUDS: { g: Grid; x: number; y: number }[] = [
  { g: cloud([[0, 0, 7], [9, -4, 9], [19, -1, 8], [27, 2, 6], [-8, 3, 5]], 6), x: 40, y: 22 },
  { g: cloud([[0, 0, 5], [7, -3, 6], [14, 0, 5]], 3), x: 150, y: 40 },
  { g: cloud([[0, 0, 6], [8, -5, 8], [17, -2, 7], [25, 1, 5], [-7, 2, 4]], 4), x: 276, y: 56 },
  { g: cloud([[0, 0, 3], [5, -2, 4], [10, 0, 3]], 2), x: 112, y: 66 },
  { g: cloud([[0, 0, 4], [6, -2, 5], [12, 0, 4]], 2), x: 196, y: 74 },
];

const paintClouds = (p: PixelPainter): void => {
  for (const c of CLOUDS) p.stamp(c.g, c.x, c.y, CLOUD_PAL);
};

// ---------------------------------------------------------------- far hills + castle
const farTop = (x: number): number => 94 - 5 * wave(x, 2, 0.4) - 3 * wave(x, 5, 1.7) - 1.2 * wave(x, 9, 0.3);

const CASTLE: Grid = [
  "..k.k.............k.k..",
  "..kkk.............kkk..",
  "..kKk...k.k.k.....kKk..",
  "..kKk...kkkkk.....kKk..",
  "..kKkkkkkKkkkkkkkkkKk..",
  "..kKkkkkkKkkkkkkkkkKk..",
  "..kKkkkkkKkk.kkkkkkKk..",
  ".kkKkkkkkKkk.kkkkkkKkk.",
  ".kkKkkkkkKkkkkkkkkkKkk.",
  "kkkkkkkkkkkkkkkkkkkkkkk",
];

const paintFar = (p: PixelPainter): void => {
  // back range, very pale
  p.ridge((x) => 86 - 4 * wave(x, 3, 2.1) - 2 * wave(x, 7, 0.2), FAR.haze, 112);
  p.ridge(farTop, FAR.base, 112);
  // left-lit rim on the crests
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(farTop(x));
    const slope = farTop(x + 1) - farTop(x - 1);
    p.px(x, t, slope > 0 ? FAR.rim : FAR.base);
  }
  // castle on the crest
  const cx = 70;
  const top = Math.round(farTop(cx + 11));
  p.stamp(CASTLE, cx, top - CASTLE.length + 2, { k: FAR.castle, K: FAR.castleLit });
  // haze where the hills meet the meadow
  p.dither(0, 106, TILE_W, 2, FAR.haze, 8);
  p.rect(0, 108, TILE_W, 4, FAR.haze);
};

// ---------------------------------------------------------------- mid hills + trees
const backTop = (x: number): number => 103 - 4 * wave(x, 3, 0.9) - 2 * wave(x, 6, 2.4);
const midTop = (x: number): number => 108 - 3 * wave(x, 2, 2.6) - 2.5 * wave(x, 5, 0.8);

const tree = (seed: number, size: number): Grid => {
  const r = size;
  const blobs: Blob[] = [
    { x: 0, y: 0, r },
    { x: -Math.round(r * 0.7), y: Math.round(r * 0.55), r: Math.round(r * 0.75) },
    { x: Math.round(r * 0.75), y: Math.round(r * 0.5), r: Math.round(r * 0.8) },
  ];
  if (seed % 2) blobs.push({ x: Math.round(r * 0.1), y: -Math.round(r * 0.7), r: Math.round(r * 0.6) });
  const crown = clumps(blobs, { hi: "l", mid: "b", lo: "d", edge: "o" });
  const g = crown.map((row) => row.split(""));
  const h = g.length;
  const w = g[0].length;
  // big-form light: the whole crown is lit from the top left and shaded to the bottom right,
  // so the clumps read as one canopy instead of a pile of separately shaded balls
  const DARKER: Record<string, string> = { h: "l", l: "b", b: "d", d: "d" };
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const c = g[j][i];
      if (c === "." || c === "o") continue;
      const u = i / (w - 1), v = j / (h - 1);
      if (u + v * 1.3 > 1.45) g[j][i] = DARKER[c];
      if (v > 0.62 && g[j][i] === "l") g[j][i] = "b";
    }
  // spot highlights on the upper-left clump edges
  for (let j = 1; j < h; j++)
    for (let i = 1; i < w; i++)
      if (g[j][i] === "l" && g[j - 1][i] === "o" && i < w * 0.6 && size >= 5) g[j][i] = "h";
  const mid = Math.floor(w / 2);
  const cols = size >= 6 ? [mid - 1, mid, mid + 1] : [mid - 1, mid];
  // the trunk grows up into the crown: fill the gap under the clumps
  for (let j = h - 1; j >= 0; j--) {
    if (cols.every((c) => g[j][c] !== ".")) break;
    for (const c of cols) if (g[j][c] === ".") g[j][c] = c === cols[0] ? "T" : "t";
  }
  // shadowed bottom edge of the crown where it overhangs the trunk
  const rows = g.map((r) => r.join(""));
  const trunkH = Math.max(2, Math.round(size * 0.45));
  for (let k = 0; k < trunkH; k++) {
    const row = new Array(w).fill(".");
    for (const c of cols) row[c] = c === cols[0] || k === trunkH - 1 ? "T" : "t";
    if (k === trunkH - 1) {
      row[cols[0] - 1] = "T";
      row[cols[cols.length - 1] + 1] = "T";
    }
    rows.push(row.join(""));
  }
  return rows;
};

const BUSH: Grid = [
  "..oooo...",
  ".ollbbo..",
  "olbbbbdoo",
  "obbbddddo",
  ".ooooooo.",
];

const paintMid = (p: PixelPainter): void => {
  // a second, bluer row of hills
  p.ridge(backTop, BACK.base, 124);
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(backTop(x));
    if (backTop(x + 1) - backTop(x - 1) > 0) p.px(x, t, BACK.rim);
  }
  // distant tree line sitting on the back hills
  p.reseed(77);
  for (let x = 0; x < TILE_W; x += 7 + Math.floor(p.rand() * 9)) {
    const r = 2 + Math.floor(p.rand() * 2);
    const t = Math.round(backTop(x));
    p.disc(x, t - r + 1, r, BACK.shade);
    p.px(x - 1, t - 2 * r + 2, BACK.rim);
  }
  // nearer green hills
  p.ridge(midTop, MID.base, 124);
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(midTop(x));
    const slope = midTop(x + 1) - midTop(x - 1);
    p.px(x, t, slope >= 0 ? MID.rim : MID.base);
    if (slope >= 0.4) p.px(x, t + 1, MID.rim);
  }
  // soft shading at the hill foot
  p.dither(0, 114, TILE_W, 4, MID.shade, 6);
  // round leafy trees and bushes on the crests
  const spots: [number, number, number][] = [
    [18, 7, 1], [31, 5, 0], [96, 6, 1], [106, 4, 0], [148, 5, 1], [200, 7, 0], [214, 5, 1], [262, 6, 0], [300, 4, 1],
  ];
  for (const [x, s] of spots) p.ellipse(x + 1, Math.round(midTop(x)) + 2, s - 1, 1, MID.deep);
  for (const [x, s, v] of spots) plant(p, tree(v, s), x, Math.round(midTop(x)) + 2, TREE);
  for (const x of [52, 128, 180, 238, 284]) plant(p, BUSH, x, Math.round(midTop(x)) + 2, TREE);
};

// ---------------------------------------------------------------- meadow
// grass clumps: dark blades on a solid root, lit only at the tips (no thin two-tone strokes)
const TUFT_S: Grid = ["l.l", "ddd"];
const TUFT_M: Grid = ["..l..", "l.d.l", ".ddd."];
const TUFT_L: Grid = ["..l...l", "l.d..d.", ".ddd.d.", "..dddd."];
const TUFT_XL: Grid = ["...l.....", "l..d...l.", ".d.d..d.l", ".dddd.dd.", "..ddddd.."];

/** Flowers: a single pixel far away, a little four-petal cross near the front. */
const FLOWERS: { far: string; near: Grid }[] = [
  { far: "w", near: [".w.", "wcw", ".w."] },
  { far: "y", near: [".y.", "ycy", ".y."] },
  { far: "p", near: [".p.", "pyp", ".p."] },
  { far: "w", near: [".w.", "wyw", ".w."] },
  { far: "v", near: [".v.", "vyv", ".v."] },
];

/** Worn track the fighters stand on: wavy far and near edges around FLOOR_Y. */
const trackTop = (x: number): number => FLOOR_Y - 6 + 1.5 * wave(x, 3, 0.5) + 1.2 * wave(x, 7, 2.2);
const trackBot = (x: number): number => FLOOR_Y + 6 + 2 * wave(x, 2, 1.4) + 1.2 * wave(x, 5, 0.1);

const paintGround = (p: PixelPainter): void => {
  const g0 = 114;
  strata(
    p,
    [
      [g0, GROUND[0]],
      [118, GROUND[1]],
      [123, GROUND[2]],
      [130, GROUND[3]],
      [148, GROUND[4]],
      [164, GROUND[5]],
    ],
    p.h,
    2,
  );
  // meadow edge: a gently uneven line against the hills, with a lit lip
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(g0 - 1 - 0.8 * wave(x, 11, 0.7) - 0.6 * wave(x, 17, 2));
    p.vline(x, e, g0 - e, GROUND[0]);
    p.px(x, e, "#acd66a");
  }
  // perspective streaks: short and pale far away, longer and darker near
  p.reseed(311);
  for (let y = 117; y < p.h; y += 2 + Math.floor((y - 112) / 14)) {
    const depth = (y - 112) / 68;
    const n = Math.round(14 + depth * 8);
    const len = 2 + Math.round(depth * 6);
    const band = GROUND.findIndex((_, i) => i === GROUND.length - 1 || y < [118, 123, 130, 148, 164][i]);
    const dark = GROUND[Math.min(GROUND.length - 1, band + 1)];
    for (let k = 0; k < n; k++) {
      const x = Math.floor(p.rand() * TILE_W);
      p.hline(x, y, len, dark);
      if (depth > 0.35) p.hline(x + 1, y - 1, Math.max(1, len - 3), dark);
    }
  }
  // the worn track
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
  // two wheel ruts that follow the track: a shaded groove with a lit lip below, broken in places
  for (let x = 0; x < TILE_W; x++) {
    const t = trackTop(x), b = trackBot(x);
    for (const f of [0.4, 0.7]) {
      if (wave(x, 11, f * 9) + 0.5 * wave(x, 29, f) > 0.1) continue;
      const y = Math.round(t + (b - t) * f);
      p.px(x, y, DIRT.shade);
    }
  }
  p.reseed(902);
  // pebbles
  for (let k = 0; k < 14; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = Math.round(trackTop(x)) + 4 + Math.floor(p.rand() * 6);
    if (y >= Math.round(trackBot(x)) - 2) continue;
    p.px(x, y, DIRT.pebble);
    p.px(x + 1, y, DIRT.pebble);
    p.px(x + 1, y + 1, DIRT.pebbleShade);
    p.px(x, y + 1, DIRT.pebbleShade);
  }
  // grass tufts, bigger lower down; never on the track
  const tuftPal = (y: number): Palette => {
    const i = [118, 123, 130, 148, 164, 999].findIndex((s) => y < s);
    const deep = [...GROUND, "#447c2c", "#3a6c26", "#335f22"];
    let l = "#8cc25a";
    if (i <= 1) l = "#b4dc74";
    else if (i <= 3) l = "#a0d066";
    return { l, d: deep[i + 2] };
  };
  const onTrack = (x: number, y: number, w: number): boolean => {
    for (let i = -1; i <= w; i++) if (y >= trackTop(x + i) - 2 && y <= trackBot(x + i) + 3) return true;
    return false;
  };
  p.reseed(4242);
  for (let k = 0; k < 120; k++) {
    const y = 118 + Math.floor(Math.pow(p.rand(), 0.8) * 60);
    const x = Math.floor(p.rand() * TILE_W);
    let g = TUFT_XL;
    if (y < 124) g = TUFT_S;
    else if (y < 136) g = TUFT_M;
    else if (y < 156) g = TUFT_L;
    if (onTrack(x, y, g[0].length)) continue;
    plant(p, g, x, y, tuftPal(y));
  }
  // grass overhanging the near edge of the track
  p.reseed(613);
  const FRINGE: Grid[] = [["l.l", "dld"], ["..l..", "l.l.l", "dldld"], ["l", "d"]];
  for (let x = 0; x < TILE_W; x += 4 + Math.floor(p.rand() * 7)) {
    const g = FRINGE[Math.floor(p.rand() * FRINGE.length)];
    p.stamp(g, x, Math.round(trackBot(x)) - g.length + 1, { l: "#8cc25a", d: GROUND[3] });
  }
  // little flowers in clusters
  p.reseed(58);
  for (let c = 0; c < 16; c++) {
    const cx = Math.floor(p.rand() * TILE_W);
    const cy = 122 + Math.floor(p.rand() * 46);
    const kind = Math.floor(p.rand() * FLOWERS.length);
    for (let k = 0; k < 4; k++) {
      const x = cx + Math.floor(p.rand() * 14) - 7;
      const y = cy + Math.floor(p.rand() * 5) - 2;
      if (onTrack(x, y, 3)) continue;
      const f = y > 146 ? FLOWERS[kind].near : [FLOWERS[kind].far];
      if (y > 146) p.px(x + 1, y + 3, FLOWER.s);
      p.stamp(f, x, y, FLOWER);
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
  const pal = { d: "#2c5626" };
  for (const x of [4, 58, 132, 206, 270]) p.stamp(FRONT_TUFT, x, p.h - FRONT_TUFT.length, pal);
  // ragged blade line along the very bottom edge
  for (let x = 0; x < TILE_W; x++) {
    let h = 2;
    if ((x * 7) % 5 === 0) h += 2;
    else if ((x * 3) % 4 === 0) h += 1;
    p.vline(x, p.h - h, h, "#2c5626");
  }
};

const field: Battlefield = {
  terrain: "flat",
  ambient: "pollen",
  ambientColors: ["#fff6c8", "#ffffff", "#f0e890"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.08, drift: 2, paint: paintClouds },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.5, paint: paintMid },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
