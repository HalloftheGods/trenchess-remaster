/**
 * The Install Game cartridge, drawn whole in pixels: the studio's grey shell with its ridged grip and
 * gold contacts and the red INSTALL ribbon (as on Undead of Night's cartridge), over a Trenchess label.
 * GAME is lettered like the Trenchess logo: serif capitals, red then blue, with a gold edge. Under it a
 * dusk battlefield of the four terrains (Iron Peaks, Whispering Woods, Sunken Realm, Endless Sands)
 * on a checkered board, with the Equinox King standing on it, and a gold crown seal in the corner.
 * drawCartridge is pure (a grid of hex colours), so a preview script can draw it without Phaser.
 */
import Phaser from "phaser";

export const CARTRIDGE_WIDTH = 48;
export const CARTRIDGE_HEIGHT = 56;
/** Where the printed label sits on the cartridge, in its own pixels. */
const LABEL = { x: 5, y: 14, w: 38, h: 30 } as const;

type Hex = string;
type Grid = readonly string[];

const INK = "#0b0f1a";
const METAL = ["#3a3f4b", "#5d6372", "#8a90a0", "#c3c8d4"];
const BLOOD = ["#4a0d16", "#8f1d2a", "#c8283a", "#ef5a5a"];
const BONE = ["#6b6150", "#a89c82", "#e9e2cf", "#fff6dc"];
const GOLD = ["#6e4a10", "#b9861f", "#f2c94c", "#ffe9a8"];
const RED = ["#7f1d1d", "#b91c1c", "#ef4444", "#fca5a5"];
const BLUE = ["#1e3a8a", "#1d4ed8", "#3b82f6", "#93c5fd"];
const SKY = ["#141230", "#221d48", "#35306a", "#5a4a86"];
const GRASS = ["#1d4a24", "#2f7a33", "#4caf50", "#8bd36b"];
const SAND = ["#9a6b2a", "#d6a24e", "#efcd84"];
const WATER = ["#173a8a", "#2563eb", "#7cb7ff"];
const PEAK = ["#4a2a2a", "#8e3b33", "#c95a46", "#f3e6d8"];

export class Pixels {
  readonly px: (Hex | null)[];
  readonly w: number;
  readonly h: number;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Array<Hex | null>(w * h).fill(null);
  }
  get(x: number, y: number): Hex | null {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.px[y * this.w + x];
  }
  set(x: number, y: number, c: Hex | null): this {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c;
    return this;
  }
  rect(x: number, y: number, w: number, h: number, c: Hex): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }
  frame(x: number, y: number, w: number, h: number, c: Hex): this {
    return this.rect(x, y, w, 1, c).rect(x, y + h - 1, w, 1, c).rect(x, y, 1, h, c).rect(x + w - 1, y, 1, h, c);
  }
  grid(x: number, y: number, rows: Grid, legend: Readonly<Record<string, Hex>>): this {
    rows.forEach((row, j) => [...row].forEach((ch, i) => legend[ch] && this.set(x + i, y + j, legend[ch])));
    return this;
  }
  blit(src: Pixels, x: number, y: number): this {
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      const c = src.get(i, j);
      if (c) this.set(x + i, y + j, c);
    }
    return this;
  }
  /** A copy one pixel bigger on every side, ringed in `c` wherever a drawn pixel touches empty space. */
  outlined(c: Hex): Pixels {
    const out = new Pixels(this.w + 2, this.h + 2).blit(this, 1, 1);
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
      if (out.get(x, y)) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.get(x - 1 + dx, y - 1 + dy));
      if (near) out.set(x, y, c);
    }
    return out;
  }
}

// ---------------------------------------------------------------- lettering

const SMALL: Readonly<Record<string, Grid>> = {
  I: ["###", ".#.", ".#.", ".#.", "###"],
  N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
  S: ["###", "#..", "###", "..#", "###"],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  A: ["###", "#.#", "###", "#.#", "#.#"],
  L: ["#..", "#..", "#..", "#..", "###"],
};

/** Serif capitals after the Trenchess logo's Cinzel: thick stems, hairline joins, flared feet. */
const SERIF: Readonly<Record<string, Grid>> = {
  G: ["..####.", ".##...#", "##.....", "##..###", "##...##", "##...##", ".##..##", "..####."],
  A: ["...#....", "..###...", "..####..", ".#..##..", ".#..##..", ".######.", "#....##.", "##..####"],
  M: ["##.....##", "###...###", "####.####", "##.###.##", "##..#..##", "##.....##", "##.....##", "###...###"],
  E: ["######", ".##..#", ".##...", ".####.", ".##...", ".##...", ".##..#", "######"],
};

const widthOf = (text: string, font: Readonly<Record<string, Grid>>): number => [...text].reduce((sum, l) => sum + font[l][0].length + 1, -1);

const stamp = (c: Pixels, x: number, y: number, text: string, font: Readonly<Record<string, Grid>>, color: (letter: number, row: number) => Hex): void => {
  let left = x;
  [...text].forEach((letter, n) => {
    font[letter].forEach((row, j) => [...row].forEach((ch, i) => ch === "#" && c.set(left + i, y + j, color(n, j))));
    left += font[letter][0].length + 1;
  });
};

/** GAME as the logo letters TRENCHESS: the first half red, the second blue, lit on top, gold along the top edge, then ink. */
const title = (word: string): Pixels => {
  const t = new Pixels(widthOf(word, SERIF), 8);
  const half = Math.ceil(word.length / 2);
  stamp(t, 0, 0, word, SERIF, (n, row) => {
    const ramp = n < half ? RED : BLUE;
    return row === 0 ? ramp[3] : row < 4 ? ramp[2] : row < 7 ? ramp[1] : ramp[0];
  });
  // The logo's gold edge, kept to the lit top of each letter so the counters stay open at this size.
  const edged = t.outlined(INK);
  for (let y = 0; y < edged.h; y++) for (let x = 0; x < edged.w; x++) {
    const rim = edged.get(x, y) === INK && edged.get(x, y - 1) === null && edged.get(x, y + 1) !== null && edged.get(x, y + 1) !== INK;
    if (rim) edged.set(x, y, GOLD[2]);
  }
  return edged;
};

/** The red banner across the top with its notched tails folded behind, as on the studio's other cartridges. */
const ribbon = (c: Pixels, w: number, text: string, behind: Hex): void => {
  c.rect(0, 3, 4, 7, BLOOD[1]).rect(w - 4, 3, 4, 7, BLOOD[1]);
  c.set(0, 6, behind).set(w - 1, 6, behind);
  c.rect(2, 1, w - 4, 7, BLOOD[2]).rect(2, 1, w - 4, 1, BLOOD[3]).rect(2, 7, w - 4, 1, BLOOD[1]);
  c.rect(2, 8, 2, 1, BLOOD[0]).rect(w - 4, 8, 2, 1, BLOOD[0]);
  const left = Math.floor((w - widthOf(text, SMALL)) / 2);
  stamp(c, left, 3, text, SMALL, () => BLOOD[0]);
  stamp(c, left, 2, text, SMALL, () => BONE[3]);
};

// ---------------------------------------------------------------- the battlefield

/** Dusk: deep indigo high up, dithered warmer toward the horizon, a few stars. */
const sky = (c: Pixels, w: number): void => {
  c.rect(0, 0, w, 22, SKY[0]);
  for (let y = 9; y < 22; y++) for (let x = 0; x < w; x++) {
    const band = y < 13 ? (x + y) % 2 === 0 : y < 17 ? true : (x + y) % 2 === 0;
    if (band) c.set(x, y, y < 17 ? SKY[1] : SKY[2]);
    if (y >= 19) c.set(x, y, (x + y) % 2 === 0 ? SKY[3] : SKY[2]);
  }
  for (const [x, y] of [[4, 11], [33, 10], [13, 13], [26, 12], [36, 15], [1, 16]]) c.set(x, y, BONE[3]);
};

/** Iron Peaks on the left horizon, snow-capped; dunes of the Endless Sands on the right. */
const horizon = (c: Pixels): void => {
  const peak: Grid = ["....w....", "...www...", "..wrhw...", "..rhhr.w.", ".rrhhrrww", ".rhhhrrhr", "rrhhrrhhr", "rhhhrhhhr"];
  c.grid(0, 15, peak, { w: PEAK[3], r: PEAK[2], h: PEAK[1] });
  const dunes: Grid = ["......ll....", "...lllssl...", ".llsssssslll", "lsssssssssss"];
  c.grid(26, 19, dunes, { l: SAND[2], s: SAND[1] });
};

/** The board: checkered grass rows that widen toward the viewer, water of the Sunken Realm on one edge. */
const board = (c: Pixels, w: number, h: number): void => {
  for (let y = 22; y < h; y++) {
    const size = y < 24 ? 2 : y < 26 ? 3 : 4;
    const shift = Math.floor((y - 22) / size) % 2;
    for (let x = 0; x < w; x++) {
      const dark = (Math.floor(x / (size + 1)) + shift) % 2 === 0;
      c.set(x, y, dark ? GRASS[1] : GRASS[2]);
    }
  }
  c.rect(0, 22, w, 1, GRASS[3]);
  for (let y = 25; y < h; y++) for (let x = 0; x < 6 + (y - 25); x++) c.set(x, y, (x + y) % 3 === 0 ? WATER[2] : x + 2 > 6 + (y - 25) ? WATER[0] : WATER[1]);
};

/** A tree of the Whispering Woods. */
const TREE: Grid = ["..ggg..", ".gGGgg.", "gGGgggg", "gGgggdg", ".gdgdd.", "...t...", "...t..."];

/** The Equinox King in gold, cross on his crown, standing on the board. */
const KING: Grid = ["...#...", "..###..", "...#...", "..ooo..", "..oOo..", "...o...", "..oOo..", ".ooOoo.", "ooooooo"];

/** The corner seal: a gold disc stamped with a crown. */
const SEAL: Grid = [".ggggg.", "gGGGGGg", "g*G*G*g", "g*****g", "g*****g", "gGGGGGg", ".ggggg."];

const label = (): Pixels => {
  const { w, h } = LABEL;
  const c = new Pixels(w, h);
  sky(c, w);
  horizon(c);
  board(c, w, h);
  c.blit(new Pixels(7, 7).grid(0, 0, TREE, { g: GRASS[2], G: GRASS[3], d: GRASS[0], t: SAND[0] }).outlined(INK), 23, 18);
  c.blit(new Pixels(7, 9).grid(0, 0, KING, { "#": GOLD[3], o: GOLD[1], O: GOLD[3] }).outlined(INK), 9, 20);
  ribbon(c, w, "INSTALL", SKY[0]);
  const big = title("GAME");
  c.blit(big, Math.floor((w - big.w) / 2), 9);
  c.grid(w - 8, h - 8, SEAL, { g: INK, G: GOLD[1], "*": GOLD[3] });
  c.frame(0, 0, w, h, BONE[2]);
  return c;
};

// ---------------------------------------------------------------- shell

/** Grey plastic lit from the upper left, a ridged grip, the label recess and the gold contacts. */
const shell = (c: Pixels): void => {
  const W = CARTRIDGE_WIDTH;
  c.rect(3, 0, W - 6, 48, INK).rect(1, 1, W - 2, 46, INK).rect(0, 3, W, 42, INK);
  c.rect(3, 1, W - 6, 46, METAL[2]).rect(2, 2, W - 4, 44, METAL[2]).rect(1, 3, W - 2, 42, METAL[2]);
  c.rect(3, 1, W - 6, 1, METAL[3]).rect(1, 3, 1, 42, METAL[3]).set(2, 2, METAL[3]);
  c.rect(W - 2, 3, 1, 42, METAL[1]).rect(3, 46, W - 6, 1, METAL[1]).set(W - 3, 45, METAL[1]);
  for (let i = 0; i < 8; i++) c.rect(8 + i * 4, 5, 2, 6, METAL[1]).rect(8 + i * 4, 5, 2, 1, METAL[0]);
  c.frame(LABEL.x - 1, LABEL.y - 1, LABEL.w + 2, LABEL.h + 2, INK);
  c.rect(8, 48, 32, 8, INK);
  c.rect(10, 48, 28, 6, GOLD[2]);
  c.rect(10, 48, 28, 1, GOLD[1]);
  for (const gap of [16, 23, 30]) c.rect(gap, 49, 2, 5, GOLD[1]);
};

export const drawCartridge = (): Pixels => {
  const c = new Pixels(CARTRIDGE_WIDTH, CARTRIDGE_HEIGHT);
  shell(c);
  c.blit(label(), LABEL.x, LABEL.y);
  return c;
};

/** Paints the cartridge into a canvas texture once, kept crisp (nearest-neighbour) at any scale. */
export const paintCartridge = (textures: Phaser.Textures.TextureManager, key: string): void => {
  if (textures.exists(key)) return;
  const art = drawCartridge();
  const tex = textures.createCanvas(key, art.w, art.h);
  if (!tex) return;
  const ctx = tex.getContext();
  for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) {
    const c = art.get(x, y);
    if (!c) continue;
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
};
