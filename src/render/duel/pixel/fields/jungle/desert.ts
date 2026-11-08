import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { mix, type Palette } from "../../palette";
import { canopy, crownRow, hazeStreaks, hills, jungleSky, palm, plant, tuft, wdx } from "./common";

/**
 * Jungle "Endless Sands": the dry clay beds. A drought-gold sky over dusty hills, a parched
 * jungle edge with bare trees, eroded red-clay bluffs and boulders, and a wide bed of cracked
 * clay plates curling at their edges where the fighters stand.
 */

// ---------------------------------------------------------------- palettes
const HAZE = { hi: "#fbeab0", lo: "#e8d494" };
const FAR = { fill: "#b4ac74", rim: "#c8bc80" };
const BACK = { rim: "#a0a660", lit: "#8a9654", mid: "#7a884c", shade: "#6c7a46", fill: "#667242" };
const DEAD = "#6a6040";
const PALM = { trunk: "#7a6a44", leaf: "#7a8a4a" };
const BLUFF = { lit: "#d4a676", face: "#bc8c5c", band: "#a87a4e", shade: "#8e6440", o: "#6a4a2c" };
const CLAY = ["#cc9e6c", "#c49462", "#ba8a58"];
const CLAY_FAR = "#d2aa7c";
const CRACK = { deep: "#6e3c1e", mid: "#8a5a34" };
const EDGE = { lit: "#e0bc90", shade: "#a67a4c" };
const DUST = "#d8b484";
const ROCK: Palette = { o: "#5e4228", d: "#86603e", m: "#a67a4c", l: "#c49a6a", h: "#dcb88a" };
const DRY = { tip: "#e8d090", blade: "#b8a060", dark: "#6a5030" };
const FRONT = { o: "#3a2614", b: "#4e3420", l: "#6a4a2c" };

// ---------------------------------------------------------------- layers

const paintSky = (p: PixelPainter): void => jungleSky(p, { sunX: 220, sunY: 72, horizon: 98, from: 3, stars: 6 });

const paintHaze = (p: PixelPainter): void => {
  hazeStreaks(
    p,
    [
      [16, 46, 72],
      [140, 58, 64],
      [250, 40, 50],
      [80, 76, 40],
    ],
    HAZE.hi,
    HAZE.lo,
  );
};

/** Far: low dusty hills dissolving into the heat haze. */
const paintFar = (p: PixelPainter): void => {
  hills(p, (x) => 90 - 5 * wave(x, 2, 1.4) - 2 * wave(x, 5, 0.2), FAR.fill, FAR.rim);
};

/** A bare dead tree: a forked trunk with a few crooked branches. */
const deadTree = (p: PixelPainter, x: number, base: number, h: number, dir: number): void => {
  p.rect(x, base - h, 2, h, DEAD);
  const forks: [number, number, number][] = [
    [0.55, dir, 10],
    [0.75, -dir, 8],
    [0.9, dir, 6],
  ];
  for (const [at, d, len] of forks) {
    const y0 = base - Math.round(h * at);
    p.line(x + (d > 0 ? 1 : 0), y0, x + d * len, y0 - Math.round(len * 0.8), DEAD);
    p.line(x + d * Math.round(len * 0.6), y0 - Math.round(len * 0.5), x + d * Math.round(len * 0.4), y0 - len - 2, DEAD);
  }
};

/** Back: the parched jungle edge, olive crowns gone dusty, bare trees and palms above them. */
const paintBack = (p: PixelPainter): void => {
  deadTree(p, 60, 102, 26, 1);
  deadTree(p, 196, 100, 30, -1);
  palm(p, 120, 102, 24, 5, PALM.trunk, PALM.leaf);
  palm(p, 290, 102, 20, -4, PALM.trunk, PALM.leaf);
  const crowns = crownRow(p, 1717, 104, 15, 5, 9, 5).filter((_c, i) => i % 4 !== 2);
  canopy(p, crowns, BACK, p.h);
};

/** An eroded clay bluff: a flat-topped mound with banded strata, lit left side and gullies. */
const bluff = (p: PixelPainter, cx: number, w: number, top: number, base: number): void => {
  for (let x = cx - w; x <= cx + w; x++) {
    const d = Math.abs(x - cx) / w;
    const t = Math.round(top + Math.max(0, (d - 0.55) / 0.45) * (base - top) + wave(x, 13, cx) * 0.8);
    for (let y = t; y < base; y++) {
      let c = BLUFF.face;
      if (x < cx - w * 0.6) c = BLUFF.lit;
      if (x > cx + w * 0.55) c = BLUFF.shade;
      if ((y - top) % 6 === 4) c = mix(c, BLUFF.band, 0.7);
      if ((x * 7 + cx) % 11 === 0 && y > t + 1 && y < t + 3 + ((x * 5) % 9)) c = BLUFF.shade;
      p.px(x, y, c);
    }
    p.px(x, t, x < cx ? EDGE.lit : BLUFF.lit);
  }
};

const BOULDER: Grid = ["...llh...", ".lmmmlhl.", "lmmmmmmld", "mmmmmmmdd", "dmmmmmddo", ".ddddddo."];

/** Mid: the clay bluffs at the far side of the bed, boulders at their feet. */
const paintMid = (p: PixelPainter): void => {
  bluff(p, 40, 34, 94, 114);
  bluff(p, 160, 22, 100, 114);
  bluff(p, 250, 40, 90, 114);
  for (const [x, y] of [
    [84, 113],
    [196, 113],
    [302, 112],
  ] as [number, number][])
    plant(p, BOULDER, x, y, ROCK);
};

// ---------------------------------------------------------------- ground

interface Seed {
  x: number;
  y: number;
  tone: number;
}

/** Cell seeds for the cracked plates: rows spaced in perspective, fewer and wider near. */
const plateSeeds = (p: PixelPainter): Seed[] => {
  p.reseed(2024);
  const out: Seed[] = [];
  const rows: [number, number][] = [
    [114, 22],
    [118, 19],
    [123, 16],
    [129, 13],
    [136, 11],
    [144, 9],
    [153, 8],
    [163, 7],
    [174, 6],
  ];
  for (const [y, n] of rows)
    for (let i = 0; i < n; i++) {
      const sx = (i + 0.2 + p.rand() * 0.6) * (TILE_W / n);
      const sy = y + (p.rand() - 0.5) * (y - 106) * 0.18;
      out.push({ x: sx, y: sy, tone: Math.floor(p.rand() * 3) });
    }
  return out;
};

const plateTone = (s: Seed, y: number): string => {
  const far = Math.max(0, 1 - (y - 112) / 22);
  return mix(CLAY[s.tone], CLAY_FAR, far * 0.7);
};

/** Crack colour by depth: faint at the far edge, mid-brown behind the fighters, deep only in the near rows. */
const crackTone = (y: number, tone: string): string => {
  if (y < 122) return mix(CRACK.mid, tone, 0.45);
  if (y < 150) return CRACK.mid;
  return CRACK.deep;
};

/** The cracked clay bed: a Voronoi plate pattern, dark crack lines, curled lit plate edges. */
const paintGround = (p: PixelPainter): void => {
  const seeds = plateSeeds(p);
  const cracked: boolean[][] = [];
  const owner: Seed[][] = [];
  for (let y = 112; y < p.h; y++) {
    const row: boolean[] = [];
    const own: Seed[] = [];
    const width = 0.5 + ((y - 112) / 68) * 1.1;
    const sy = 2.4 - ((y - 112) / 68) * 0.9;
    for (let x = 0; x < TILE_W; x++) {
      let d1 = Infinity;
      let d2 = Infinity;
      let best = seeds[0];
      for (const s of seeds) {
        const dy = (y - s.y) * sy;
        if (Math.abs(dy) > 40) continue;
        const dx = wdx(x, s.x);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          best = s;
        } else if (d < d2) d2 = d;
      }
      own.push(best);
      row.push(d2 - d1 < width);
    }
    cracked.push(row);
    owner.push(own);
  }
  for (let y = 112; y < p.h; y++) {
    const j = y - 112;
    for (let x = 0; x < TILE_W; x++) {
      const tone = plateTone(owner[j][x], y);
      let c = tone;
      if (cracked[j][x]) c = crackTone(y, tone);
      else if (j > 0 && cracked[j - 1][x]) c = EDGE.lit;
      else if (j + 1 < cracked.length && cracked[j + 1][x] && y > 124) c = mix(tone, EDGE.shade, 0.6);
      p.px(x, y, c);
    }
  }
  // the far edge of the bed: a soft dusty lip against the bluffs
  p.hline(0, 112, TILE_W, EDGE.lit);
  p.dither(0, 113, TILE_W, 2, DUST, 6);
  // wind-blown dust drifts
  for (const [cx, cy, rx] of [
    [70, 146, 30],
    [230, 160, 40],
    [300, 126, 18],
  ] as [number, number, number][]) {
    p.ellipse(cx, cy, rx, 1, DUST);
    p.hline(cx - Math.round(rx * 0.5), cy - 1, rx, mix(DUST, EDGE.lit, 0.5));
  }
  // sparse dry tufts and pebbles
  for (const [x, y, s] of [
    [24, 122, 0],
    [118, 128, 1],
    [208, 120, 0],
    [276, 150, 2],
    [12, 168, 2],
    [164, 172, 1],
  ] as [number, number, number][])
    tuft(p, x, y, s, CLAY[1], DRY);
  plant(p, BOULDER, 150, 122, ROCK);
};

/** Front: a dead branch reaching in from the right corner and dry stalks on the left. */
const paintFront = (p: PixelPainter): void => {
  const branch: [number, number, number, number][] = [
    [320, 178, 284, 162],
    [284, 162, 262, 158],
    [300, 170, 296, 150],
    [284, 162, 278, 148],
  ];
  for (const [x0, y0, x1, y1] of branch) {
    p.line(x0, y0, x1, y1, FRONT.b);
    p.line(x0, y0 + 1, x1, y1 + 1, FRONT.o);
    p.line(x0, y0 - 1, x1, y1 - 1, FRONT.l);
  }
  for (let i = 0; i < 9; i++) {
    const x = 6 + i * 3;
    const h = 10 + ((i * 7) % 11);
    p.line(x, 179, x + (i % 3) - 1, 179 - h, i % 2 === 0 ? FRONT.b : FRONT.l);
  }
  p.ridge((x) => 176 + Math.round(1.5 * wave(x, 3, 0.9) + wave(x, 8)), FRONT.b);
};

const field: Battlefield = {
  terrain: "desert",
  ambient: "sand",
  ambientColors: ["#e0bc90", "#cc9e6c", "#f0d8a8"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.08, drift: 3, paint: paintHaze },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.35, paint: paintBack },
    { parallax: 0.6, paint: paintMid },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
