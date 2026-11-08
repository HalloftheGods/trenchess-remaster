import type { Battlefield } from "../../field";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import { mix } from "../../palette";
import { canopy, crownRow, frondClump, hazeStreaks, hills, jungleSky, vines, ziggurat, type TemplePal } from "./common";

/**
 * Jungle "Iron Peaks": mossy temple steps. Steep jungle hills under a low sun, a great stepped
 * temple rising out of the canopy, broken vine-hung pillars, and a broad flagstone landing
 * with moss in every joint where the fighters stand, a step down to the terrace below.
 */

// ---------------------------------------------------------------- palettes
const HAZE = { hi: "#ecdc96", lo: "#cec47c" };
const FAR1 = { fill: "#94a46a", rim: "#acb47a" };
const FAR2 = { fill: "#7c945e", rim: "#90a46a" };
const FAR_TEMPLE: TemplePal = { lit: "#a6b07c", face: "#909e6c", shade: "#82925e", moss: "#7e9a5e", dark: "#687e52" };
const BACK = { rim: "#6a9a4c", lit: "#568442", mid: "#4a763a", shade: "#3e6834", fill: "#365e30" };
const BUSH = { rim: "#86b05e", lit: "#6a9a4e", mid: "#5a8a44", shade: "#4a7a3c", fill: "#426e36" };
const TEMPLE: TemplePal = { lit: "#9aa888", face: "#7a8a6e", shade: "#5e6e54", moss: "#4a8a3a", dark: "#2a3424" };
const PILLAR = { lit: "#8e9c7c", face: "#6e7e62", shade: "#525e48", o: "#323a2c", moss: "#4a8a3a", mossLit: "#6aa848" };
const VINE = { stem: "#2a5a24", leaf: "#4a9a3a" };
const STONE = ["#8a9a7c", "#7e8e70", "#748466"];
const FLAG = { lip: "#9aa888", joint: "#4a5a42", deep: "#3a4634", crack: "#56644c" };
const RISER = { face: "#5a6a50", dark: "#46543e", joint: "#323c2c" };
const MOSS = { d: "#2e6a28", m: "#3e8034", l: "#4e9a3c", h: "#6ab848" };
const FRONT = { body: "#14321a", lit: "#2a5a28" };

// ---------------------------------------------------------------- layers

const paintSky = (p: PixelPainter): void => jungleSky(p, { sunX: 64, sunY: 82, horizon: 100, stars: 12 });

const paintHaze = (p: PixelPainter): void => {
  hazeStreaks(
    p,
    [
      [10, 56, 62],
      [128, 40, 50],
      [210, 64, 76],
      [290, 48, 40],
    ],
    HAZE.hi,
    HAZE.lo,
  );
};

/** Far: steep forested hills with a pale temple far off on a ridge. */
const paintFar = (p: PixelPainter): void => {
  const peak = (x: number): number => 74 - 12 * Math.abs(wave(x, 2, 0.5)) - 4 * wave(x, 5, 1.2);
  hills(p, peak, FAR1.fill, FAR1.rim);
  ziggurat(p, 100, 72, 22, 4, 3, FAR_TEMPLE);
  hills(p, (x) => 90 - 7 * Math.abs(wave(x, 3, 2.1)) - 2 * wave(x, 7, 0.4), FAR2.fill, FAR2.rim);
};

/** Back: the canopy the temple rises out of. */
const paintBack = (p: PixelPainter): void => {
  canopy(p, crownRow(p, 1201, 100, 12, 6, 10, 6), BACK, p.h);
};

/** A broken pillar: a squared shaft with a lit left face, banded drums, a mossy jagged top. */
const pillar = (p: PixelPainter, x: number, top: number, base: number, w: number): void => {
  for (let y = top; y < base; y++) {
    const jag = y - top < 3 ? Math.abs(((x + y * 3) % 5) - 2) : 0;
    for (let i = jag; i < w; i++) {
      let c = PILLAR.face;
      if (i === jag) c = PILLAR.lit;
      else if (i >= w - 2) c = PILLAR.shade;
      if (i === w - 1) c = PILLAR.o;
      if ((y - top) % 11 === 10) c = PILLAR.o;
      p.px(x + i, y, c);
    }
  }
  for (let i = 0; i < w; i++) {
    p.px(x + i, top - 1, PILLAR.moss);
    if (i % 3 !== 2) p.px(x + i, top, PILLAR.mossLit);
    if ((i * 7) % 5 < 2) p.vline(x + i, top + 1, 2 + (i % 3), PILLAR.moss);
  }
};

/** Mid: the great temple sunk in bushes, broken pillars and creepers. */
const paintTemple = (p: PixelPainter): void => {
  ziggurat(p, 214, 116, 128, 11, 5, TEMPLE);
  vines(
    p,
    [
      [163, 84, 14],
      [174, 73, 9],
      [263, 84, 16],
      [252, 73, 8],
    ],
    VINE.stem,
    VINE.leaf,
  );
  canopy(p, crownRow(p, 3307, 108, 14, 5, 8, 3), BUSH, 112, false);
  pillar(p, 30, 58, 116, 12);
  pillar(p, 72, 78, 116, 10);
  pillar(p, 312, 70, 116, 9);
  vines(
    p,
    [
      [33, 58, 26],
      [75, 78, 18],
      [315, 70, 22],
    ],
    VINE.stem,
    VINE.leaf,
  );
};

// ---------------------------------------------------------------- ground

/** Rows of the landing: [top, bottom, stone width]. */
const ROWS: [number, number, number][] = [
  [119, 123, 20],
  [123, 128, 32],
  [128, 134, 40],
  [134, 141, 53],
  [141, 149, 64],
];
const RISER_TOP = 149;
const LOWER = 159;
const LOWER_ROWS: [number, number, number][] = [
  [159, 168, 80],
  [168, 180, 107],
];

/** One perspective row of flagstones with lit top lips, dark joints and moss in the seams. */
const flagRow = (p: PixelPainter, y0: number, y1: number, w: number, row: number, dim: number): void => {
  const off = row % 2 === 0 ? 0 : Math.floor(w / 2);
  const n = Math.round(TILE_W / w);
  const sw = TILE_W / n;
  for (let k = 0; k < n; k++) {
    const x0 = Math.round(off + k * sw);
    const x1 = Math.round(off + (k + 1) * sw);
    const tone = mix(STONE[(k * 7 + row * 3) % 3], FLAG.deep, dim);
    p.rect(x0, y0, x1 - x0, y1 - y0, tone);
    p.hline(x0 + 1, y0, x1 - x0 - 2, mix(FLAG.lip, FLAG.deep, dim));
    p.vline(x0, y0, y1 - y0, FLAG.joint);
    // a hairline crack on some stones
    if ((k + row) % 3 === 0) {
      const cx = x0 + Math.floor((x1 - x0) * 0.6);
      p.line(cx, y0 + 1, cx + 2, y1 - 2, mix(FLAG.crack, FLAG.deep, dim));
    }
    // moss cushions along the joints: a low mound on the bottom seam, a creeping line up the side
    const m = (k * 5 + row * 11) % 7;
    if (m < 4) {
      const mw = (m + 2) * 3 + Math.floor((y1 - y0) / 2);
      const mx = x0 + 1 + ((k * 13) % Math.max(1, x1 - x0 - mw));
      for (let j = 0; j < mw; j++) {
        const h = Math.round(Math.min(y1 - y0 - 2, 1 + (m % 3)) * Math.sin((Math.PI * (j + 0.5)) / mw));
        p.vline(mx + j, y1 - 1 - h, h + 1, MOSS.m);
        p.px(mx + j, y1 - 1 - h, j < mw * 0.6 ? MOSS.h : MOSS.l);
      }
      p.vline(x0, y0 + 1, Math.max(1, m), MOSS.d);
    }
  }
  p.hline(0, y1 - 1, TILE_W, FLAG.joint);
};

const paintGround = (p: PixelPainter): void => {
  // the upper step behind the landing: a lit lip, a riser face
  p.rect(0, 110, TILE_W, 3, STONE[0]);
  p.hline(0, 110, TILE_W, FLAG.lip);
  p.rect(0, 113, TILE_W, 6, RISER.face);
  for (let x = 0; x < TILE_W; x += 16) p.vline(x, 113, 6, RISER.joint);
  ROWS.forEach(([y0, y1, w], i) => flagRow(p, y0, y1, w, i, 0.12 * (ROWS.length - 1 - i) / (ROWS.length - 1)));
  // the step down: the riser face in shade, moss draped over its lip
  p.rect(0, RISER_TOP, TILE_W, LOWER - RISER_TOP, RISER.face);
  p.rect(0, LOWER - 3, TILE_W, 3, RISER.dark);
  for (let x = 0; x < TILE_W; x += 27) p.vline(x, RISER_TOP, LOWER - RISER_TOP, RISER.joint);
  p.hline(0, RISER_TOP, TILE_W, FLAG.lip);
  for (let x = 0; x < TILE_W; x++) {
    const drape = Math.max(0, Math.round(3 * wave(x, 7, 0.4) + 2 * wave(x, 13, 1.7) - 1));
    if (drape > 0) {
      p.vline(x, RISER_TOP, drape, MOSS.m);
      p.px(x, RISER_TOP, MOSS.h);
      p.px(x, RISER_TOP + drape, MOSS.d);
    }
  }
  LOWER_ROWS.forEach(([y0, y1, w], i) => flagRow(p, y0, y1, w, i + 1, 0.25));
  p.hline(0, LOWER, TILE_W, mix(FLAG.lip, FLAG.deep, 0.25));
  // fighters' contact shade: soft darker band where the landing meets the riser
  p.dither(0, RISER_TOP - 2, TILE_W, 2, FLAG.joint, 6);
};

/** Front: dark fern clumps on the lower terrace. */
const paintFront = (p: PixelPainter): void => {
  for (const [cx, s] of [
    [12, 1],
    [168, 0.7],
    [290, 0.9],
  ] as [number, number][])
    frondClump(p, cx, s, FRONT.body, FRONT.lit);
};

const field: Battlefield = {
  terrain: "mountain",
  ambient: "leaves",
  ambientColors: ["#4a9a3a", "#6ab848", "#8a7a3c"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.08, drift: 2, paint: paintHaze },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.32, paint: paintBack },
    { parallax: 0.55, paint: paintTemple },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
