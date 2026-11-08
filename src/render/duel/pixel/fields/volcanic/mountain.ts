import type { Battlefield } from "../../field";
import type { Palette } from "../../palette";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { LAVA, RANGE_BACK, RANGE_FAR, SMOKE, bandIndex, fissure, paintSky, paintSmoke, paintVolcanoes, plant, plume, strata, wdx } from "./common";

/**
 * Volcanic "Iron Peaks": an obsidian highland. A wall of volcanoes fills the horizon, black glassy
 * spires rise at mid distance with lava bleeding from their cracks, and the fighters stand on a
 * violet-black plateau split by glowing fissures and strewn with obsidian shards.
 */

// ---------------------------------------------------------------- palettes
const OBS = { rim: "#b0503a", gloss: "#6a5a7c", lit: "#3a3448", mid: "#2a2434", shade: "#1a1620", deep: "#100c14", crack: "#ff8a3a", hot: LAVA.hot };
const GSTOPS: [number, string][] = [
  [113, "#5a3a44"],
  [118, "#4e3a48"],
  [124, "#463848"],
  [132, "#403446"],
  [145, "#342c3c"],
  [160, "#272030"],
];
const GR = { lip: "#7a4a50", seam: "#1a1420", crack: "#120c14" };
const SHARD: Palette = { o: OBS.deep, d: OBS.shade, m: OBS.mid, l: OBS.lit, h: OBS.gloss, w: "#9a8aac" };

// ---------------------------------------------------------------- sky + far
const paintSkyLayer = (p: PixelPainter): void => paintSky(p, 110, 60, 19);

const paintSmokeLayer = (p: PixelPainter): void =>
  paintSmoke(p, [
    [20, 24, 100, 8],
    [170, 30, 120, 9],
    [100, 54, 70, 5],
    [260, 62, 60, 4],
    [30, 76, 50, 3],
  ]);

const backRidge = (x: number): number => 84 - 6 * wave(x, 3, 0.2) - 3 * wave(x, 7, 1.9) - 1.5 * wave(x, 15, 0.6);
const farRidge = (x: number): number => 98 - 4 * wave(x, 4, 2.2) - 2 * wave(x, 9, 0.8);

const paintFar = (p: PixelPainter): void => {
  paintVolcanoes(
    p,
    backRidge,
    [
      { x: 60, y: 58, crater: 5, slope: 0.85 },
      { x: 196, y: 66, crater: 3, slope: 1.0 },
    ],
    RANGE_BACK,
    112,
    true,
  );
  plume(p, 60, 56, 28, SMOKE);
  paintVolcanoes(p, farRidge, [{ x: 268, y: 78, crater: 3, slope: 1.1 }], RANGE_FAR, 112, true);
};

// ---------------------------------------------------------------- obsidian spires
interface Spire {
  x: number;
  y: number;
  sl: number;
  sr: number;
  /** Lean of the edge between the lit and shaded face. */
  ridge: number;
}

/** A sharp, chipped spire profile: a 1px tip, steep flanks broken by notches every few px. */
const spireTop = (c: Spire, x: number): number => {
  const dx = wdx(x, c.x);
  const a = Math.abs(dx);
  const s = dx < 0 ? c.sl : c.sr;
  const notch = a > 3 && (a + Math.round(c.x)) % 5 === 0 ? 2 : 0;
  return Math.round(c.y + a * s + notch);
};

const SPIRES: Spire[] = [
  { x: 28, y: 60, sl: 3.2, sr: 2.6, ridge: 0.12 },
  { x: 14, y: 84, sl: 2.4, sr: 3.0, ridge: 0.1 },
  { x: 44, y: 80, sl: 2.8, sr: 2.2, ridge: 0.15 },
  { x: 120, y: 92, sl: 2.2, sr: 2.6, ridge: 0.1 },
  { x: 132, y: 100, sl: 2.0, sr: 2.0, ridge: 0.1 },
  { x: 226, y: 54, sl: 3.0, sr: 3.4, ridge: 0.1 },
  { x: 210, y: 78, sl: 2.4, sr: 2.8, ridge: 0.12 },
  { x: 246, y: 74, sl: 2.6, sr: 2.4, ridge: 0.15 },
  { x: 236, y: 96, sl: 2.0, sr: 2.2, ridge: 0.1 },
  { x: 296, y: 96, sl: 2.4, sr: 2.0, ridge: 0.1 },
];
const SPIRE_BASE = 120;

const paintSpires = (p: PixelPainter): void => {
  const owner = (x: number, y: number): number => {
    for (let k = SPIRES.length - 1; k >= 0; k--) if (y >= spireTop(SPIRES[k], x)) return k;
    return -1;
  };
  for (let x = 0; x < TILE_W; x++)
    for (let y = 40; y < SPIRE_BASE; y++) {
      const k = owner(x, y);
      if (k < 0) continue;
      const c = SPIRES[k];
      const top = spireTop(c, x);
      const dx = wdx(x, c.x);
      const dy = y - c.y;
      const div = Math.round(c.ridge * dy);
      const lit = dx < div;
      let col = lit ? OBS.lit : OBS.shade;
      if (lit && dx >= div - 1) col = OBS.mid;
      // a glassy highlight streak running down the lit face
      if (lit && dx === div - Math.round(dy * 0.18) - 3 && dy % 13 < 9) col = OBS.gloss;
      // conchoidal facets: darker bands across the faces
      if (dy > 4 && (dy + (lit ? 0 : 3)) % 10 === 0 && Math.abs(dx - div) > 1) col = lit ? OBS.mid : OBS.deep;
      if (y === top) col = lit ? OBS.rim : OBS.deep;
      const back = owner(x, y - 1);
      if (y === top && back >= 0 && back !== k) col = OBS.deep;
      p.px(x, y, col);
    }
  // lava bleeding down cracks in the big spires
  for (const [x0, y0, len] of [[24, 80, 26], [222, 72, 30], [246, 92, 16], [120, 104, 10]] as [number, number, number][]) {
    let x = x0;
    for (let y = y0; y < y0 + len; y++) {
      if (y % 5 === 0) x += (y + x0) % 3 === 0 ? -1 : 1;
      p.px(x, y, y % 7 < 2 ? OBS.hot : OBS.crack);
      if (y % 3 === 0) p.px(x + 1, y, LAVA.deep);
    }
  }
  // a rubble skirt along their feet, glowing in a few places
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(112 + 1.5 * wave(x, 6, 0.9) + wave(x, 15, 2.3));
    p.vline(x, t, SPIRE_BASE - t, OBS.shade);
    p.px(x, t, OBS.lit);
    if (wave(x, 7, 1.1) + 0.5 * wave(x, 19, 0.3) > 1.15) p.px(x, t + 2, OBS.crack);
  }
};

// ---------------------------------------------------------------- obsidian plateau

/**
 * An obsidian shard: a leaning wedge whose tip sits over one end of its base, with a bright
 * glassy edge along the long face, a dark back face and a black foot.
 */
const shard = (w: number, h: number, flip: boolean): Grid => {
  const rows: Grid = [];
  for (let j = 0; j < h; j++) {
    const u = (j + 1) / h;
    const tipX = Math.round(w * 0.3);
    const l = Math.round(tipX * (1 - u));
    const r = Math.round(tipX + (w - 1 - tipX) * u);
    let row = "";
    for (let i = 0; i < w; i++) {
      let c = ".";
      if (i >= l && i <= r) {
        c = i - l < 1 ? "w" : "m";
        if (i - l === 1) c = "h";
        if (i > l + (r - l) * 0.6) c = "d";
        if (j === h - 1) c = "o";
      }
      row += c;
    }
    rows.push(flip ? row.split("").reverse().join("") : row);
  }
  return rows;
};

const paintGround = (p: PixelPainter): void => {
  strata(p, GSTOPS, p.h, 3);
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(112 - 1.2 * wave(x, 7, 0.4) - 0.8 * wave(x, 19, 2.2));
    p.vline(x, e, GSTOPS[0][0] - e, GSTOPS[0][1]);
    p.px(x, e, GR.lip);
  }
  // weathered hollows in the plateau: flat darker basins with a lit far rim and a dithered edge
  const HOLLOWS: [number, number, number, number][] = [
    [30, 124, 26, 2], [168, 121, 20, 2], [262, 126, 30, 2], [96, 158, 44, 4], [236, 168, 52, 5], [8, 174, 30, 3],
  ];
  for (const [cx, cy, rx, ry] of HOLLOWS) {
    const bi = bandIndex(GSTOPS, cy);
    const dark = GSTOPS[Math.min(GSTOPS.length - 1, bi + 1)][1];
    const lip = GSTOPS[Math.max(0, bi - 1)][1];
    for (let j = -ry; j <= ry; j++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j / (ry + 0.5)) ** 2)));
      p.hline(cx - half + 2, cy + j, half * 2 - 3, dark);
      p.dither(cx - half, cy + j, 2, 1, dark, 8);
      p.dither(cx + half - 1, cy + j, 2, 1, dark, 8);
      if (j === -ry) p.hline(cx - half + 3, cy + j - 1, half * 2 - 5, GR.seam);
      if (j === ry) p.hline(cx - half + 3, cy + j + 1, half * 2 - 5, lip);
    }
  }
  // slab joints: long horizontal steps with a lit lip, bolder near the front
  p.reseed(733);
  for (let y = 118; y < p.h - 2; y += 6 + Math.floor((y - 112) / 5)) {
    const depth = (y - 112) / 68;
    for (let k = 0; k < 2 + Math.round(depth * 2); k++) {
      const x = Math.floor(p.rand() * TILE_W);
      const len = 10 + Math.round(depth * 40 + p.rand() * 16);
      const bi = bandIndex(GSTOPS, y);
      const lip = GSTOPS[Math.max(0, bi - 1)][1];
      const step = 4 + Math.floor(p.rand() * (len - 8));
      for (let i = 0; i < len; i++) {
        const yy = y + (i >= step ? 1 : 0);
        p.px(x + i, yy, GR.seam);
        if (i > 0 && i < len - 1) p.px(x + i, yy + 1, lip);
      }
    }
  }
  // glowing fissures (the board's orange cracks), thin far off and wider near
  const FISSURES: [number, number, number, number][] = [
    [20, 121, 22, 4], [150, 118, 14, 3], [246, 123, 20, 4],
    [70, 156, 40, 6], [200, 162, 48, 7], [290, 152, 26, 5], [130, 174, 34, 8],
  ];
  for (const [x, y, len, seg] of FISSURES) fissure(p, x, y, len, seg, GR.crack, OBS.crack, y > 150 ? OBS.hot : undefined);
  // shards lying about: small far, larger near, each with a shadow
  const SHARDS: [number, number, number, number, number][] = [
    [40, 120, 3, 3, 0], [96, 118, 4, 3, 1], [178, 121, 3, 3, 0], [268, 119, 4, 4, 1],
    [12, 130, 5, 5, 0], [116, 128, 6, 5, 1], [232, 131, 5, 4, 0], [304, 129, 4, 4, 1],
    [50, 150, 7, 7, 1], [176, 152, 6, 6, 0], [268, 166, 9, 9, 0], [100, 172, 8, 8, 1], [8, 168, 7, 6, 0],
  ];
  for (const [x, by, w, h, f] of SHARDS) {
    const shadow = GSTOPS[Math.min(GSTOPS.length - 1, bandIndex(GSTOPS, by) + 2)][1];
    p.hline(x - Math.floor(w / 2) + 1, by + 1, w + 2, shadow);
    plant(p, shard(w, h, f === 1), x, by, SHARD);
  }
};

// ---------------------------------------------------------------- foreground
const paintFront = (p: PixelPainter): void => {
  // a dark jagged rubble lip, with two big obsidian blades breaking the frame
  for (let x = 0; x < TILE_W; x++) {
    const h = Math.round(2.5 + 1.5 * wave(x, 6, 0.4) + wave(x, 17, 1.1));
    if (h > 0) p.vline(x, p.h - h, h, OBS.deep);
  }
  const FRONT: Palette = { o: "#08060a", d: "#100c14", m: "#16121c", l: "#221c2a", h: "#3a3048", w: "#5a4a68" };
  plant(p, shard(16, 20, false), 10, p.h + 2, FRONT);
  plant(p, shard(9, 11, true), 22, p.h + 1, FRONT);
  plant(p, shard(12, 14, true), 236, p.h + 2, FRONT);
};

const field: Battlefield = {
  terrain: "mountain",
  ambient: "embers",
  ambientColors: ["#ff8a3a", "#ffd070", "#ff5a20"],
  layers: [
    { parallax: 0.05, paint: paintSkyLayer },
    { parallax: 0.08, drift: 2, paint: paintSmokeLayer },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.5, paint: paintSpires },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
