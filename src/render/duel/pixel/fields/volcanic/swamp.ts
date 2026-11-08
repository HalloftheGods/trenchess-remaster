import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import {
  EMBER_COLORS, LAVA, RANGE_BACK, RANGE_FAR, SMOKE, bandIndex, groundCells, hash, lavaPool, paintSky, paintSmoke, paintVolcanoes, plume, strata, wdx,
} from "./common";

/**
 * Volcanic "Sunken Realm": a lava marsh. A molten lake glows under low smoke with obsidian
 * spires standing in it; the near shore is a skin of cooled crust broken into plates, its seams
 * still running with lava, and open pools bubble either side of the fighters.
 */

// ---------------------------------------------------------------- palettes
const LAKE = { far: "#c84a1a", mid: "#e0602a", hot: "#ffa040", crust: "#5a1e0e", crustLit: "#8a3418" };
const SPIRE = { rim: "#c85a2a", lit: "#3a2028", body: "#22141a", shade: "#160c10" };
const BANK = { top: "#5a2a18", body: "#3a1a10", shade: "#2a120a", glow: "#a8401a" };
const GSTOPS: [number, string][] = [
  [119, "#6a3020"],
  [123, "#5e2c1c"],
  [128, "#54281a"],
  [135, "#4c2416"],
  [148, "#3a1a10"],
  [162, "#2c140c"],
];
const SEAM = { dark: "#1a0c08", glow: LAVA.deep, hot: LAVA.lava };

// ---------------------------------------------------------------- sky + far
const paintSkyLayer = (p: PixelPainter): void => paintSky(p, 108, 160, 73);

const paintSmokeLayer = (p: PixelPainter): void =>
  paintSmoke(p, [
    [0, 40, 140, 10],
    [160, 34, 130, 9],
    [40, 70, 90, 6],
    [210, 78, 80, 5],
    [120, 92, 60, 3],
  ]);

const backRidge = (x: number): number => 94 - 3 * wave(x, 3, 2.6) - 1.5 * wave(x, 8, 0.1);
const farRidge = (x: number): number => 104 - 2 * wave(x, 2, 0.4) - 1.5 * wave(x, 5, 1.6);

const paintFar = (p: PixelPainter): void => {
  paintVolcanoes(p, backRidge, [{ x: 250, y: 74, crater: 3, slope: 0.95 }], RANGE_BACK, 112, true);
  paintVolcanoes(p, farRidge, [{ x: 60, y: 80, crater: 4, slope: 0.75 }], RANGE_FAR, 112, true);
  plume(p, 60, 78, 20, SMOKE);
};

// ---------------------------------------------------------------- the lava lake and its spires
interface Spire {
  x: number;
  h: number;
  w: number;
}
const SPIRES: Spire[] = [
  { x: 22, h: 30, w: 11 }, { x: 33, h: 16, w: 7 }, { x: 98, h: 20, w: 8 }, { x: 166, h: 36, w: 12 },
  { x: 179, h: 17, w: 7 }, { x: 155, h: 12, w: 6 }, { x: 244, h: 23, w: 9 }, { x: 296, h: 14, w: 6 },
];
const LAKE_TOP = 108;
const LAKE_BOT = 122;

const paintLake = (p: PixelPainter): void => {
  // molten surface: brighter towards the viewer, with dark crust rafts drifting on it
  strata(p, [[LAKE_TOP, LAKE.far], [LAKE_TOP + 4, LAKE.mid]], LAKE_BOT, 3);
  p.hline(0, LAKE_TOP, TILE_W, LAKE.crust);
  p.reseed(404);
  for (let k = 0; k < 22; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = LAKE_TOP + 2 + Math.floor(p.rand() * (LAKE_BOT - LAKE_TOP - 4));
    const len = 4 + Math.floor(p.rand() * (6 + (y - LAKE_TOP)));
    p.hline(x, y, len, LAKE.crust);
    p.hline(x + 1, y - 1, Math.max(1, len - 3), LAKE.crustLit);
    // hot glints between the rafts
    p.hline(x + len + 2, y + 1, 2, LAKE.hot);
  }
  // obsidian spires standing in the lake: stepped tapering silhouettes lit on the left
  for (const s of SPIRES) {
    const base = 113 + (s.x % 3);
    for (let y = base - s.h; y < base; y++) {
      const u = (y - (base - s.h)) / s.h;
      const half = Math.max(0, Math.floor(s.w * 0.5 * Math.pow(u, 0.7) + (Math.floor(u * 6) % 2) * 0.5));
      for (let dx = -half; dx <= half; dx++) {
        let c = SPIRE.body;
        if (dx === -half) c = SPIRE.rim;
        else if (dx < 0) c = SPIRE.lit;
        if (dx > half * 0.4 && half > 1) c = SPIRE.shade;
        p.px(s.x + dx, y, c);
      }
    }
    // the glow where the spire meets the lava
    p.hline(s.x - Math.floor(s.w / 2) - 1, base, s.w + 2, LAKE.hot);
    p.hline(s.x - Math.floor(s.w / 2), base + 1, s.w, SPIRE.shade);
  }
};

// ---------------------------------------------------------------- crust banks
/** Low banks of crust along the near edge of the lake, glowing underneath. */
const bankTop = (x: number): number => {
  const hump = Math.max(0, wave(x, 3, 0.7) + 0.6 * wave(x, 7, 2.1));
  return 119 - Math.round(hump * 4);
};

const paintBanks = (p: PixelPainter): void => {
  for (let x = 0; x < TILE_W; x++) {
    const t = bankTop(x);
    if (t >= 119) continue;
    p.vline(x, t, 124 - t, BANK.body);
    p.px(x, t, BANK.top);
    if (bankTop(x + 1) > t) p.px(x, t + 1, BANK.shade);
    if (t < 117 && (x * 7) % 9 === 0) p.px(x, t + 2, BANK.glow);
  }
};

// ---------------------------------------------------------------- crust shore
const POOLS: [number, number, number, number][] = [
  [40, 126, 9, 1], [140, 125, 6, 1], [262, 127, 11, 2],
  [18, 162, 18, 3], [196, 168, 22, 4], [300, 158, 10, 2],
];

const paintGround = (p: PixelPainter): void => {
  strata(p, GSTOPS, p.h, 3);
  // the shoreline: a glowing lip where the crust meets the lake
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(119 - 0.8 * wave(x, 9, 0.7) - 0.6 * wave(x, 23, 2));
    p.vline(x, e, 117 - e, GSTOPS[0][1]);
    p.px(x, e - 1, LAVA.glow);
    p.px(x, e, "#8a3a20");
  }
  // cooled crust plates, their seams still hot (wider and brighter than the basalt plain)
  const y0 = 120;
  const cells = groundCells(y0, p.h, 4321, 3.4, 2.9);
  const at = (x: number, y: number) => cells[y - y0]?.[((x % TILE_W) + TILE_W) % TILE_W];
  for (let y = y0; y < p.h; y++)
    for (let x = 0; x < TILE_W; x++) {
      const c = at(x, y);
      const bi = bandIndex(GSTOPS, y);
      if (c.seam) {
        const h = hash(c.id, c.other);
        let col = SEAM.dark;
        if (h % 3 === 0) col = SEAM.glow;
        // seams run hot near the lake and towards the viewer, but stay a dull glow in the band
        // where the fighters stand so they read cleanly against it
        const calm = y > 128 && y < 150;
        if (h % 3 === 0 && y > 124 && !calm && (x + y) % 5 !== 0) col = SEAM.hot;
        if (calm && h % 3 !== 0 && h % 7 === 0) col = SEAM.glow;
        p.px(x, y, col);
        continue;
      }
      // each plate darkens towards its lower edge (a rounded, slumped skin)
      const down = at(x, y + 1);
      const up = at(x, y - 1);
      if (down && down.seam && y > 126) p.px(x, y, GSTOPS[Math.min(GSTOPS.length - 1, bi + 2)][1]);
      else if (up && up.seam && y > 122) p.px(x, y, GSTOPS[Math.max(0, bi - 1)][1]);
      else if (hash(c.id) % 4 === 0) p.px(x, y, GSTOPS[Math.min(GSTOPS.length - 1, bi + 1)][1]);
    }
  // ropy wrinkles on the plates near the front (pahoehoe skin): short curved dark arcs
  p.reseed(66);
  for (let k = 0; k < 18; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 150 + Math.floor(p.rand() * 26);
    const c = at(x, y);
    if (!c || c.seam) continue;
    const dark = GSTOPS[Math.min(GSTOPS.length - 1, bandIndex(GSTOPS, y) + 1)][1];
    for (let i = 0; i < 3; i++) {
      p.hline(x + i, y + i * 3, 5, dark);
      p.px(x + i - 1, y + i * 3 - 1, dark);
    }
  }
  // open lava pools, away from where the fighters stand
  for (const [x, y, rx, ry] of POOLS) lavaPool(p, x, y, rx, ry, "#7a2412", SEAM.dark);
  // bubbles on the pools
  for (const [x, y, rx] of POOLS) {
    if (rx < 10) continue;
    p.px(x - 3, y - 1, LAVA.white);
    p.px(x + 4, y, LAVA.hot);
    p.px(x + 5, y, LAVA.white);
  }
};

// ---------------------------------------------------------------- foreground
const paintFront = (p: PixelPainter): void => {
  // a heaped crust lip along the bottom edge, cracked with glowing seams
  for (let x = 0; x < TILE_W; x++) {
    const h = Math.round(3 + 2 * wave(x, 4, 1.2) + wave(x, 11, 0.3));
    if (h <= 0) continue;
    p.vline(x, p.h - h, h, "#160a06");
    p.px(x, p.h - h, "#3a160c");
    if (h > 3 && wdx(x, 80) % 37 === 0) p.vline(x, p.h - h + 2, h - 2, LAVA.deep);
  }
};

const field: Battlefield = {
  terrain: "swamp",
  ambient: "embers",
  ambientColors: EMBER_COLORS,
  layers: [
    { parallax: 0.05, paint: paintSkyLayer },
    { parallax: 0.08, drift: 3, paint: paintSmokeLayer },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.4, paint: paintLake },
    { parallax: 0.6, paint: paintBanks },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
