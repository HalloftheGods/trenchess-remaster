import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import { EMBER_COLORS, RANGE_BACK, RANGE_FAR, SMOKE, bandIndex, groundCells, hash, paintSky, paintSmoke, paintVolcanoes, plume, strata, wdx } from "./common";

/**
 * Volcanic "Open Ground": a basalt plain of hexagonal column tops whose seams glow faintly, under
 * red smoke. Far volcanoes smoulder on the horizon, flat-topped basalt mesas stand at mid
 * distance and the fighters meet on the broad cracked pavement.
 */

// ---------------------------------------------------------------- palettes
const MESA = { rim: "#8a3a24", top: "#4a3a3a", lit: "#3a3234", face: "#2a2426", shade: "#1e1a1c", seam: "#141012", glow: "#a03a18" };
const GSTOPS: [number, string][] = [
  [112, "#5a3028"],
  [116, "#523430"],
  [121, "#4c3836"],
  [128, "#48403f"],
  [140, "#423c3d"],
  [154, "#363234"],
  [166, "#2c2a2c"],
];
const CELL = { seam: "#1a1616", glow: "#8a2e14", hot: "#ff7a2a" };

// ---------------------------------------------------------------- sky + far
const paintSkyLayer = (p: PixelPainter): void => paintSky(p, 112, 214, 31);

const paintSmokeLayer = (p: PixelPainter): void =>
  paintSmoke(p, [
    [10, 30, 90, 7],
    [130, 22, 70, 5],
    [214, 40, 96, 8],
    [70, 60, 60, 4],
    [180, 74, 54, 4],
    [276, 66, 46, 3],
  ]);

const backRidge = (x: number): number => 96 - 4 * wave(x, 3, 1.1) - 2 * wave(x, 7, 0.3);
const farRidge = (x: number): number => 103 - 3 * wave(x, 2, 2.4) - 2 * wave(x, 5, 0.9) - wave(x, 13, 1.3);

const paintFar = (p: PixelPainter): void => {
  paintVolcanoes(p, backRidge, [{ x: 92, y: 76, crater: 3, slope: 0.9 }], RANGE_BACK, 112, false);
  paintVolcanoes(p, farRidge, [{ x: 214, y: 70, crater: 5, slope: 0.8 }], RANGE_FAR, 112, true);
  plume(p, 214, 68, 26, SMOKE);
};

// ---------------------------------------------------------------- basalt mesas
interface Mesa {
  x: number;
  w: number;
  top: number;
}
const MESAS: Mesa[] = [
  { x: 30, w: 34, top: 92 },
  { x: 58, w: 16, top: 101 },
  { x: 150, w: 22, top: 99 },
  { x: 250, w: 44, top: 88 },
  { x: 282, w: 18, top: 100 },
];
const MESA_BASE = 118;

/** Width of one basalt column in a mesa's face. */
const COL = 4;

/**
 * Mesa profile: a cap made of column tops at slightly different heights, rounded shoulders where
 * the outer columns have crumbled, then a talus slope flaring out to the plain.
 */
const mesaTop = (m: Mesa, x: number): number => {
  const dx = wdx(x, m.x);
  const a = Math.abs(dx);
  const half = m.w / 2;
  if (a <= half) {
    const col = Math.floor((dx + half) / COL);
    const step = hash(col + 7, m.x) % 3;
    const shoulder = Math.max(0, Math.round(a - half + 3));
    return m.top + (step === 0 ? 1 : 0) + shoulder;
  }
  const o = a - half;
  return Math.round(m.top + 3 + o * 1.6 + o * o * 0.06);
};

const paintMesas = (p: PixelPainter): void => {
  for (let x = 0; x < TILE_W; x++) {
    let best: Mesa | null = null;
    let t = MESA_BASE;
    for (const m of MESAS) {
      const mt = mesaTop(m, x);
      if (mt < t) {
        t = mt;
        best = m;
      }
    }
    if (!best) continue;
    const dx = wdx(x, best.x);
    const half = best.w / 2;
    const cap = Math.abs(dx) <= half;
    const ci = (((Math.floor(dx + half) % COL) + COL) % COL);
    // where this column breaks off: talus begins below it
    const talus = best.top + 10 + (hash(Math.floor((dx + half) / COL), best.x + 3) % 6);
    for (let y = t; y < MESA_BASE; y++) {
      let c = dx < 0 ? MESA.lit : MESA.shade;
      if (cap && y < talus) {
        // vertical basalt columns: a lit left edge, a mid body and a dark joint on the right
        c = MESA.face;
        if (ci === 0) c = MESA.lit;
        if (ci === COL - 1) c = MESA.seam;
        if (dx > half - 5 && ci !== 0) c = MESA.shade;
        if (y - t < 2) c = MESA.top;
      } else if (cap) {
        // the scree heaped against the cliff foot, dithered from lit to shade
        c = (x + y) % 2 === 0 && dx < 0 ? MESA.lit : MESA.shade;
        if (y === talus) c = MESA.face;
      }
      p.px(x, y, c);
    }
    // the horizon glow catches the top edge
    p.px(x, t, MESA.rim);
  }
  // rubble foot with a faint glowing seam where hot rock shows through
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(113 + 1.5 * wave(x, 6, 0.8) + wave(x, 17, 2.1));
    p.vline(x, t, MESA_BASE - t, MESA.shade);
    p.px(x, t, MESA.lit);
    if (wave(x, 9, 0.4) + 0.6 * wave(x, 23, 1.1) > 1.1) p.px(x, t + 2, MESA.glow);
  }
};

// ---------------------------------------------------------------- basalt pavement

/** Second tone for alternate column tops, one step darker than the stratum. */
const darker = (y: number): string => GSTOPS[Math.min(GSTOPS.length - 1, bandIndex(GSTOPS, y) + 1)][1];
const lighter = (y: number): string => GSTOPS[Math.max(0, bandIndex(GSTOPS, y) - 2)][1];

const paintGround = (p: PixelPainter): void => {
  strata(p, GSTOPS, p.h, 3);
  // far edge of the plain, catching the red glow
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(111 - 0.8 * wave(x, 11, 0.7) - 0.6 * wave(x, 19, 2));
    p.vline(x, e, 113 - e, GSTOPS[0][1]);
    p.px(x, e, "#8a4430");
  }
  // hexagonal column tops: alternate cells a shade darker, joints dark with a lit lip below them,
  // and some joints glowing where heat still rises through
  const y0 = 113;
  const cells = groundCells(y0, p.h, 977, 2.6, 3.4);
  const at = (x: number, y: number) => cells[y - y0]?.[((x % TILE_W) + TILE_W) % TILE_W];
  for (let y = y0; y < p.h; y++)
    for (let x = 0; x < TILE_W; x++) {
      const c = at(x, y);
      const depth = (y - 112) / 68;
      if (c.seam) {
        const h = hash(c.id, c.other);
        let col = CELL.seam;
        if (h % 6 === 0 && depth > 0.12) col = CELL.glow;
        if (h % 19 === 0 && depth > 0.25) col = CELL.hot;
        p.px(x, y, col);
        continue;
      }
      const up = at(x, y - 1);
      if (up && up.seam && depth > 0.12) p.px(x, y, lighter(y));
      else if (hash(c.id) % 3 === 0) p.px(x, y, darker(y));
    }
  // loose scoria pebbles
  p.reseed(808);
  for (let k = 0; k < 26; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 120 + Math.floor(p.rand() * 58);
    p.px(x, y, "#6a6264");
    p.px(x + 1, y, "#2a2426");
    if (y > 150) {
      p.px(x, y + 1, "#2a2426");
      p.px(x + 1, y + 1, "#1a1618");
    }
  }
};

// ---------------------------------------------------------------- foreground
const paintFront = (p: PixelPainter): void => {
  // a low lip of broken basalt along the bottom edge, with stubs of columns in the corners
  for (let x = 0; x < TILE_W; x++) {
    const h = Math.round(3 + 1.5 * wave(x, 5, 0.4) + wave(x, 13, 2.1));
    if (h <= 0) continue;
    p.vline(x, p.h - h, h, "#141012");
    p.px(x, p.h - h, "#2a2224");
  }
  const STUBS: [number, number, number][] = [
    [6, 12, 7], [13, 8, 6], [214, 10, 6], [221, 6, 7],
  ];
  for (const [x, h, w] of STUBS) {
    p.rect(x, p.h - h, w, h, "#1c1719");
    p.hline(x, p.h - h, w, "#3a3032");
    p.hline(x + 1, p.h - h + 1, w - 2, "#2a2224");
    p.vline(x, p.h - h, h, "#2a2224");
    p.vline(x + w - 1, p.h - h + 1, h - 1, "#0e0a0c");
  }
};

const field: Battlefield = {
  terrain: "flat",
  ambient: "embers",
  ambientColors: EMBER_COLORS,
  layers: [
    { parallax: 0.05, paint: paintSkyLayer },
    { parallax: 0.08, drift: 2, paint: paintSmokeLayer },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.5, paint: paintMesas },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
