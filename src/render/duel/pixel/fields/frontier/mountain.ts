import type { Battlefield } from "../../field";
import type { Palette } from "../../palette";
import { TILE_W, wave, type PixelPainter } from "../../painter";
import type { Grid } from "../../sheet";
import { bandAt, paintDuskSky, paintMesas, paintStreaks, plant, strata, type Mesa } from "./common";

/**
 * Frontier "Iron Peaks": red mesa country. Hazy tablelands under the dusk, nearer towering
 * red buttes banded with strata and hot along their sunward rims, slender hoodoos, and a
 * floor of red slickrock ledges with junipers and fallen boulders.
 */

// ---------------------------------------------------------------- palettes
const HAZE = { lit: "#b0605a", shade: "#9a5456", band: "#8c4c52", rim: "#e08c6a" };
const BUTTE = { lit: "#c4704a", shade: "#8a4830", band: "#7a3a28", rim: "#f0a870", talus: "#9a5236" };
const HOODOO: Palette = { o: "#4a2018", d: "#7a3a28", m: "#a85a3c", l: "#d08a68", c: "#e8c09a" };
const GROUND = ["#c47a56", "#b86a48", "#ac6242", "#a0583c", "#8a4830", "#7a3e2a"];
const GSTOP = [116, 120, 126, 134, 150, 165];
const ROCK = { ledge: "#d89a74", ledgeShade: "#6a3020", crack: "#5a2a1c", crackLit: "#d08a68" };
const STONE: Palette = { o: "#4a1e14", d: "#7a3a28", m: "#a85a3c", l: "#c47a56", h: "#e0a07a" };
const JUNIPER: Palette = { o: "#2a3018", d: "#3e4a24", l: "#5e6a34", h: "#8a9048", t: "#5a3a22" };

// ---------------------------------------------------------------- far tablelands
const FAR_MESAS: Mesa[] = [
  { x: 10, y: 74, w: 26, cap: 10, slope: 0.5 },
  { x: 110, y: 82, w: 18, cap: 8, slope: 0.55 },
  { x: 196, y: 70, w: 14, cap: 12, slope: 0.6 },
  { x: 262, y: 84, w: 22, cap: 8, slope: 0.5 },
];

const paintFar = (p: PixelPainter): void => {
  paintMesas(p, FAR_MESAS, HAZE, 112);
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(104 + 1.5 * wave(x, 4, 1.4) + wave(x, 9, 0.2));
    p.vline(x, t, 112 - t, "#c8785e");
    p.px(x, t, "#e09670");
  }
};

// ---------------------------------------------------------------- buttes and hoodoos
const BUTTES: Mesa[] = [
  { x: 52, y: 52, w: 20, cap: 26, slope: 0.7 },
  { x: 96, y: 78, w: 8, cap: 14, slope: 0.8 },
  { x: 250, y: 60, w: 26, cap: 22, slope: 0.65 },
  { x: 300, y: 84, w: 6, cap: 12, slope: 0.8 },
];

/** A hoodoo: a slim, waisted pillar of red rock with a pale caprock. */
const hoodoo = (h: number): Grid => {
  const rows: string[] = [];
  rows.push(".ooooooo.");
  rows.push("occccccco");
  rows.push(".odddmll.");
  for (let j = 3; j < h; j++) {
    // knobbly, waisted column: narrow under the cap, swelling at harder layers, wide at the foot
    const t = (j - 3) / Math.max(1, h - 4);
    const knob = Math.round(0.8 * Math.sin(j * 0.9 + h));
    const w = Math.max(1, Math.min(4, Math.round(1.5 + 2.2 * t * t + knob)));
    let row = "";
    for (let i = 0; i < 9; i++) {
      const dx = i - 4;
      if (Math.abs(dx) > w) row += ".";
      else if (Math.abs(dx) === w) row += "o";
      else if (dx < 0 && dx <= -w + 1) row += "d";
      else if (dx > 0) row += "l";
      else if (j % 5 === 2) row += "d";
      else row += "m";
    }
    rows.push(row);
  }
  return rows;
};

const paintButtes = (p: PixelPainter): void => {
  paintMesas(p, BUTTES, BUTTE, 124);
  // talus shadow and scree where the buttes meet the floor
  for (let x = 0; x < TILE_W; x++) {
    const t = Math.round(112 + wave(x, 6, 0.9) + 0.6 * wave(x, 15, 2.1));
    p.vline(x, t, 124 - t, BUTTE.talus);
    p.px(x, t, wave(x, 6, 0.9) > 0 ? BUTTE.lit : BUTTE.band);
  }
  // hoodoos standing in front of the buttes
  for (const [x, h] of [[136, 30], [148, 20], [176, 24], [206, 16]] as [number, number][]) {
    const g = hoodoo(h);
    plant(p, g, x, 116, HOODOO);
  }
};

// ---------------------------------------------------------------- slickrock floor
/** A rounded boulder: dark outline, lit from the upper right. */
const boulder = (w: number, h: number): Grid => {
  const rows: string[] = [];
  const cx = (w - 1) / 2, cy = h - 1;
  for (let j = 0; j < h; j++) {
    let r = "";
    for (let i = 0; i < w; i++) {
      const nx = (i - cx) / (w / 2), ny = (j - cy) / h;
      const d = nx * nx + ny * ny;
      if (d > 1) r += ".";
      else if (d > 0.72 || j === h - 1) r += "o";
      else {
        const l = nx * 0.6 - ny * 0.8 - 0.4;
        if (l > 0.35) r += "h";
        else if (l > 0) r += "l";
        else if (l > -0.45) r += "m";
        else r += "d";
      }
    }
    rows.push(r);
  }
  return rows;
};

const JUNIPER_G: Grid = [
  "...oo.oo...",
  "..ohhollo..",
  ".ohllldllo.",
  "olllldddldo",
  "oldddddddo.",
  ".oodtdooo..",
  "....t......",
];

const paintGround = (p: PixelPainter): void => {
  strata(p, GSTOP.map((y, i) => [y, GROUND[i]] as [number, string]), p.h, 2);
  for (let x = 0; x < TILE_W; x++) {
    const e = Math.round(GSTOP[0] - 1 - wave(x, 7, 0.4) - 0.8 * wave(x, 19, 2.2));
    p.vline(x, e, GSTOP[0] - e, GROUND[0]);
    p.px(x, e, ROCK.ledge);
  }
  // slickrock ledges: long, gently curving steps, each a lit lip over a shaded riser
  const LEDGES: [number, number, number][] = [
    [0, 122, 70], [120, 124, 90], [250, 121, 60],
    [30, 131, 110], [200, 130, 80],
    [0, 156, 90], [140, 152, 120], [280, 160, 60],
    [60, 170, 140],
  ];
  for (const [x0, y0, len] of LEDGES) {
    const gi = bandAt(GSTOP, y0);
    for (let i = 0; i < len; i++) {
      const x = x0 + i;
      const y = Math.round(y0 + 1.2 * wave(x, 5, y0) + (i < 4 || i > len - 4 ? 1 : 0));
      p.px(x, y, ROCK.ledge);
      p.px(x, y + 1, GROUND[Math.min(GROUND.length - 1, gi + 2)]);
      if (y0 > 145) p.px(x, y + 2, ROCK.ledgeShade);
    }
  }
  // fine cross-bedding lines on the rock, faint, on a loose grid
  p.reseed(212);
  for (let y = 124; y < p.h; y += 5 + Math.floor((y - 112) / 12)) {
    const n = 4 + Math.round((y - 112) / 12);
    for (let k = 0; k < n; k++) {
      const x = Math.floor(p.rand() * TILE_W);
      const len = 5 + Math.floor(p.rand() * 12);
      p.hline(x, y, len, GROUND[Math.min(GROUND.length - 1, bandAt(GSTOP, y) + 1)]);
    }
  }
  // a few cracks with lit lips
  for (const [x0, y0, len] of [[24, 146, 26], [180, 168, 34], [262, 140, 18], [96, 160, 22]] as [number, number, number][])
    for (let i = 0; i < len; i++) {
      const y = y0 + Math.round(i * 0.15) + (Math.floor(i / 5) % 2);
      p.px(x0 + i, y, ROCK.crack);
      p.px(x0 + i, y + 1, ROCK.crackLit);
    }
  // pebbles
  p.reseed(83);
  for (let k = 0; k < 26; k++) {
    const x = Math.floor(p.rand() * TILE_W);
    const y = 120 + Math.floor(p.rand() * 58);
    p.px(x, y, STONE.h);
    p.px(x + 1, y, STONE.m);
    p.px(x, y + 1, STONE.d);
    p.px(x + 1, y + 1, GROUND[Math.min(GROUND.length - 1, bandAt(GSTOP, y) + 2)]);
  }
  // junipers and boulders, kept out of the fighters' middle
  for (const [x, y] of [[28, 124], [170, 122], [298, 126]] as [number, number][]) {
    p.hline(x - 4, y + 1, 10, GROUND[3]);
    plant(p, JUNIPER_G, x, y, JUNIPER);
  }
  const STONES: [number, number, number, number][] = [
    [64, 121, 5, 3], [222, 124, 6, 4], [260, 120, 4, 3],
    [10, 160, 14, 8], [22, 162, 7, 4], [196, 172, 18, 10], [246, 158, 9, 6], [120, 176, 10, 6],
  ];
  for (const [x, by, w, h] of STONES) {
    p.hline(x - Math.floor(w / 2) + 1, by + 1, w + Math.floor(w / 3), GROUND[Math.min(GROUND.length - 1, bandAt(GSTOP, by) + 2)]);
    plant(p, boulder(w, h), x, by, STONE);
  }
};

// ---------------------------------------------------------------- foreground
const FRONT_PAL: Palette = { o: "#1e0c08", d: "#2e140c", m: "#3e1c12", l: "#52281a", h: "#6e3a24" };

const paintFront = (p: PixelPainter): void => {
  for (let x = 0; x < TILE_W; x++) {
    const h = Math.round(2.5 + 1.5 * wave(x, 5, 0.4) + wave(x, 13, 1.1));
    if (h > 0) p.vline(x, p.h - h, h, FRONT_PAL.m);
  }
  plant(p, boulder(36, 16), 16, p.h + 5, FRONT_PAL);
  plant(p, boulder(14, 8), 42, p.h + 2, FRONT_PAL);
  plant(p, boulder(24, 12), 214, p.h + 4, FRONT_PAL);
  // a sprig of dry brush on the boulder
  for (const [dx, h] of [[0, 6], [2, 8], [4, 5], [-2, 4]] as [number, number][]) p.line(30 + dx, p.h - 14, 30 + dx * 2, p.h - 14 - h, FRONT_PAL.d);
};

const field: Battlefield = {
  terrain: "mountain",
  ambient: "sand",
  ambientColors: ["#e8a070", "#d08a68", "#f4c090"],
  layers: [
    { parallax: 0.05, paint: (p) => paintDuskSky(p, 160, 90, 14) },
    { parallax: 0.08, drift: 1.5, paint: paintStreaks },
    { parallax: 0.2, paint: paintFar },
    { parallax: 0.5, paint: paintButtes },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
