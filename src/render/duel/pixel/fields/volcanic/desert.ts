import type { Battlefield } from "../../field";
import type { Palette } from "../../palette";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { ASH_COLORS, LAVA, RANGE_BACK, RANGE_FAR, SMOKE, bandIndex, paintSky, paintSmoke, paintVolcanoes, plant, plume, strata } from "./common";

/**
 * Volcanic "Endless Sands": the ash flats. Dunes of grey ash, their crests caught pink by the
 * red sky, roll away to a smoking volcano; black basalt boulders lie half buried, and the
 * fighters stand on wind-combed ash with a few embers still smouldering in it.
 */

// ---------------------------------------------------------------- palettes
const DUNE_FAR = { crest: "#a8705e", lit: "#8a5c52", body: "#704a46", shade: "#5c3e3c", deep: "#4e3434" };
const DUNE = { crest: "#b89080", lit: "#94786e", body: "#766664", shade: "#5a4e4e", deep: "#463c3c" };
const GSTOPS: [number, string][] = [
  [116, "#866660"],
  [120, "#7c6c6a"],
  [126, "#746a68"],
  [134, "#6e6866"],
  [148, "#625c5a"],
  [162, "#544e4c"],
];
const STRIA = { lit: "#8e8886", dark: "#5a5452" };
const ROCK: Palette = { o: "#1e1a1a", d: "#2e2a2a", m: "#3e3a38", l: "#4a4644", h: "#6a5a56", a: "#7a7674", s: "#5a5452" };

// ---------------------------------------------------------------- sky + far
const paintSkyLayer = (p: PixelPainter): void => paintSky(p, 112, 250, 88);

const paintSmokeLayer = (p: PixelPainter): void =>
  paintSmoke(p, [
    [40, 28, 110, 7],
    [200, 22, 90, 6],
    [140, 52, 80, 5],
    [0, 66, 60, 4],
    [260, 74, 50, 3],
  ]);

const backRidge = (x: number): number => 100 - 2 * wave(x, 2, 0.9) - 1.5 * wave(x, 5, 2.4);
const farRidge = (x: number): number => 106 - 1.5 * wave(x, 3, 1.4) - wave(x, 8, 0.2);

const paintFar = (p: PixelPainter): void => {
  paintVolcanoes(p, backRidge, [{ x: 250, y: 66, crater: 5, slope: 0.7 }], RANGE_BACK, 114, true);
  plume(p, 250, 64, 30, SMOKE);
  paintVolcanoes(p, farRidge, [], RANGE_FAR, 114, false);
};

// ---------------------------------------------------------------- ash dunes

interface Crest {
  x: number;
  y: number;
}
interface DunePal {
  crest: string;
  lit: string;
  body: string;
  shade: string;
  deep: string;
}

/**
 * A chain of ash dunes: from each crest the lee falls steeply to a trough a third of the way to
 * the next crest, then the windward slope rises gently to that crest. Wraps at TILE_W.
 */
const duneSurface = (crests: Crest[], depth: number, x: number): { y: number; u: number; lee: boolean } => {
  const n = crests.length;
  for (let i = 0; i < n; i++) {
    const a = crests[i];
    const b = crests[(i + 1) % n];
    const bx = b.x + (i + 1 === n ? TILE_W : 0);
    const xx = x < a.x ? x + TILE_W : x;
    if (xx < a.x || xx >= bx) continue;
    const xt = a.x + (bx - a.x) * 0.32;
    const yt = Math.max(a.y, b.y) + depth;
    if (xx < xt) {
      const u = (xx - a.x) / (xt - a.x);
      return { y: a.y + (yt - a.y) * Math.sin((u * Math.PI) / 2), u, lee: true };
    }
    const u = (xx - xt) / (bx - xt);
    return { y: yt + (b.y - yt) * Math.sin((u * Math.PI) / 2), u, lee: false };
  }
  return { y: crests[0].y, u: 0, lee: false };
};

const paintDuneRow = (p: PixelPainter, crests: Crest[], depth: number, pal: DunePal, bottom: number): void => {
  const wrapX = (x: number): number => ((x % TILE_W) + TILE_W) % TILE_W;
  const surf = (x: number): number => Math.round(duneSurface(crests, depth, wrapX(x)).y);
  for (let x = 0; x < TILE_W; x++) {
    const s = duneSurface(crests, depth, x);
    const top = Math.round(s.y);
    p.vline(x, top, bottom - top, pal.body);
    if (s.lee) continue;
    // the windward face catches the red sky: a lit band under the surface, brightest at the brink
    p.px(x, top, s.u > 0.55 ? pal.crest : pal.lit);
    p.px(x, top + 1, pal.lit);
    p.dither(x, top + 2, 1, 2, pal.lit, 6);
  }
  // slip faces: a shadow wedge under each brink with clean diagonal edges
  crests.forEach((c, i) => {
    const b = crests[(i + 1) % crests.length];
    const bx = b.x + (i + 1 === crests.length ? TILE_W : 0);
    const xt = c.x + (bx - c.x) * 0.32;
    const yt = Math.max(c.y, b.y) + depth;
    for (let y = c.y; y < bottom; y++) {
      const left = Math.round(c.x + 1 + (y - c.y) * 0.9);
      const right = Math.round(xt + 4 - Math.max(0, y - yt) * 1.6);
      for (let x = left; x <= right; x++) {
        const sy = surf(x);
        if (y < sy) continue;
        p.px(x, y, y === sy && x < xt ? pal.deep : pal.shade);
      }
    }
  });
};

const FAR_CRESTS: Crest[] = [
  { x: 24, y: 95 }, { x: 92, y: 99 }, { x: 146, y: 94 }, { x: 210, y: 98 }, { x: 270, y: 93 },
];
const NEAR_CRESTS: Crest[] = [
  { x: 8, y: 103 }, { x: 84, y: 98 }, { x: 170, y: 104 }, { x: 244, y: 100 },
];
const NEAR_DEPTH = 10;
const NEAR_BASE = 122;

const paintFarDunes = (p: PixelPainter): void => paintDuneRow(p, FAR_CRESTS, 7, DUNE_FAR, 118);

/** A basalt boulder half sunk in ash: rounded, lit from the upper left, ash drifted on its top. */
const boulder = (w: number, h: number): Grid => {
  const rows: Grid = [];
  const cx = (w - 1) / 2;
  for (let j = 0; j < h; j++) {
    let r = "";
    for (let i = 0; i < w; i++) {
      const nx = (i - cx) / (w / 2), ny = (j - h) / h;
      const d = nx * nx + ny * ny;
      let c = ".";
      if (d <= 1) {
        c = "m";
        if (nx + ny < -0.75) c = "l";
        if (nx + ny < -1.05) c = "h";
        if (nx > 0.35) c = "d";
        if (d > 0.78) c = "o";
        if (j === 0 || (ny < -0.75 && Math.abs(nx) < 0.45 && c !== "o")) c = "a";
      }
      r += c;
    }
    rows.push(r);
  }
  return rows;
};

const paintNearDunes = (p: PixelPainter): void => {
  paintDuneRow(p, NEAR_CRESTS, NEAR_DEPTH, DUNE, NEAR_BASE);
  for (const [x, w, h] of [[56, 10, 6], [64, 6, 4], [212, 12, 7], [292, 7, 4]] as [number, number, number][]) {
    const by = Math.round(duneSurface(NEAR_CRESTS, NEAR_DEPTH, x).y) + 3;
    p.hline(x - Math.floor(w / 2), by + 1, w + 2, DUNE.deep);
    plant(p, boulder(w, h), x, by, ROCK);
  }
};

// ---------------------------------------------------------------- ash flat
const paintGround = (p: PixelPainter): void => {
  strata(p, GSTOPS, p.h, 3);
  // the far edge: a soft lit lip where the flat meets the dunes
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(115 - 0.8 * wave(x, 7, 0.4) - 0.6 * wave(x, 17, 1.9));
    p.vline(x, e, GSTOPS[0][0] - e, GSTOPS[0][1]);
    p.px(x, e, DUNE.crest);
  }
  // wind striae: long thin ripples, a lit line over a dark one, wavy and broken
  for (let y = 120; y < p.h; y += 3 + Math.floor((y - 116) / 9)) {
    const depth = (y - 112) / 68;
    const bi = bandIndex(GSTOPS, y);
    const dark = GSTOPS[Math.min(GSTOPS.length - 1, bi + 1)][1];
    const lit = bi <= 2 ? STRIA.lit : GSTOPS[Math.max(0, bi - 2)][1];
    for (let x = 0; x < TILE_W; x++) {
      const on = wave(x, 5, y * 0.7) + 0.6 * wave(x, 13, y * 1.3) > 0.35 - depth * 0.3;
      if (!on) continue;
      const yy = y + Math.round(1.2 * wave(x, 4, y * 0.37) + 0.6 * wave(x, 11, y));
      p.px(x, yy, dark);
      if (depth > 0.2) p.px(x, yy - 1, lit);
    }
  }
  // pebbles of basalt and pumice
  p.reseed(4049);
  for (let gy = 122; gy < p.h; gy += 6 + Math.floor((gy - 112) / 10))
    for (let gx = 0; gx < TILE_W; gx += 47) {
      const x = gx + Math.floor(p.rand() * 30);
      const y = gy + Math.floor(p.rand() * 3);
      const pumice = p.rand() > 0.6;
      p.px(x, y, pumice ? ROCK.a : ROCK.l);
      p.px(x + 1, y, pumice ? ROCK.s : ROCK.d);
      if (y > 150) {
        p.px(x, y - 1, pumice ? ROCK.a : ROCK.m);
        p.px(x + 2, y, ROCK.o);
      }
    }
  // a few embers still smouldering under the ash: a hot point in a dark scorch
  for (const [x, y] of [[30, 128], [150, 124], [244, 131], [96, 160], [186, 172], [292, 156]] as [number, number][]) {
    p.hline(x - 2, y, 5, "#4a3634");
    p.hline(x - 1, y + 1, 3, "#4a3634");
    p.px(x, y, LAVA.ember);
    p.px(x + 1, y, LAVA.deep);
  }
  // boulders on the flat: small far, larger near, each with a shadow
  const ROCKS: [number, number, number, number][] = [
    [72, 124, 5, 3], [204, 126, 6, 4], [10, 156, 12, 7], [230, 166, 16, 8], [130, 176, 10, 6],
  ];
  for (const [x, by, w, h] of ROCKS) {
    p.hline(x - Math.floor(w / 2) + 1, by + 1, w + 3, GSTOPS[Math.min(GSTOPS.length - 1, bandIndex(GSTOPS, by) + 2)][1]);
    plant(p, boulder(w, h), x, by, ROCK);
  }
};

// ---------------------------------------------------------------- foreground
const paintFront = (p: PixelPainter): void => {
  // a dark drift of ash along the bottom edge, and a big boulder in the near corner
  for (let x = 0; x < TILE_W; x++) {
    const h = Math.round(3 + 1.5 * wave(x, 3, 0.4) + 0.8 * wave(x, 9, 1.1));
    if (h <= 0) continue;
    p.vline(x, p.h - h, h, "#3a3434");
    p.px(x, p.h - h, "#4e4646");
  }
  const DARK: Palette = { o: "#0e0c0c", d: "#161212", m: "#1e1a1a", l: "#2a2424", h: "#3a3030", a: "#4a4444", s: "#3a3434" };
  plant(p, boulder(28, 12), 290, p.h + 3, DARK);
};

const field: Battlefield = {
  terrain: "desert",
  ambient: "ash",
  ambientColors: ASH_COLORS,
  layers: [
    { parallax: 0.05, paint: paintSkyLayer },
    { parallax: 0.08, drift: 3, paint: paintSmokeLayer },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.35, paint: paintFarDunes },
    { parallax: 0.6, paint: paintNearDunes },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
