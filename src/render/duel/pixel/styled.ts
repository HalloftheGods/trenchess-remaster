import type { Unit, UnitType } from "../../../engine/types";
import { FACTIONS, STYLES, UNIT_FOOT, UNIT_H, UNIT_W, type PieceStyle } from "../../art/unitArt";
import type { Palette } from "./palette";
import { FRAME_IDS, type FrameId, type Grid, type SpriteSheet } from "./sheet";

/**
 * Duel sprites for the chessmen sets other than the heroic Figurines: the set's own board piece,
 * pixelated to the duel's grid (area-sampled, palette-reduced, outlined) and animated the way a
 * living chess piece would move, by leaning, hopping, squashing and stretching, so the fighter
 * on the battlefield is the same piece the player sees on the board.
 */

/** Height in duel pixels the board piece is reduced to (the heroic footmen are about 50). */
const TARGET_H = 48;
/** Spare columns either side of the piece for leaning. */
const MARGIN = 10;
/** Spare rows above the piece for stretching. */
const HEADROOM = 8;
const MAX_COLORS = 14;
const KEYS = "abcdefghijklmnpqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ";
const OUTLINE = "#140c1c";

type Rgb = [number, number, number];

const toHex = ([r, g, b]: Rgb): string => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const dist = (a: Rgb, b: Rgb): number => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

interface Base {
  grid: Grid;
  palette: Palette;
}

/** Paints the board piece at its board size and reduces it to a pixel grid of TARGET_H rows. */
const pixelate = (style: PieceStyle, type: UnitType, unit: Unit): Base => {
  const src = document.createElement("canvas");
  src.width = UNIT_W;
  src.height = UNIT_H;
  const sg = src.getContext("2d", { willReadFrequently: true })!;
  STYLES[style](type, FACTIONS[unit.owner])(sg);
  const data = sg.getImageData(0, 0, UNIT_W, UNIT_H).data;
  const alphaAt = (x: number, y: number): number => data[(y * UNIT_W + x) * 4 + 3];
  let top = UNIT_FOOT;
  let left = UNIT_W;
  let right = 0;
  for (let y = 0; y < UNIT_FOOT; y++) {
    for (let x = 0; x < UNIT_W; x++) {
      if (alphaAt(x, y) < 40) continue;
      top = Math.min(top, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  const k = (UNIT_FOOT - top) / TARGET_H;
  const cols = Math.max(1, Math.ceil((right - left + 1) / k));
  const cells: (Rgb | null)[][] = [];
  for (let ty = 0; ty < TARGET_H; ty++) {
    const row: (Rgb | null)[] = [];
    for (let tx = 0; tx < cols; tx++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let y = Math.floor(top + ty * k); y < Math.min(UNIT_FOOT, Math.floor(top + (ty + 1) * k)); y++) {
        for (let x = Math.floor(left + tx * k); x < Math.min(UNIT_W, Math.floor(left + (tx + 1) * k)); x++) {
          const i = (y * UNIT_W + x) * 4;
          const al = data[i + 3] / 255;
          r += data[i] * al;
          g += data[i + 1] * al;
          b += data[i + 2] * al;
          a += al;
          n++;
        }
      }
      const covered = n > 0 && a / n >= 0.45;
      row.push(covered ? [r / a, g / a, b / a] : null);
    }
    cells.push(row);
  }
  const palette = reduce(cells);
  const grid = cells.map((row) => row.map((c) => (c ? nearest(palette, c) : ".")).join(""));
  const pal: Palette = { o: OUTLINE };
  palette.forEach((c, i) => (pal[KEYS[i]] = toHex(c)));
  return { grid, palette: pal };
};

/** A small palette for the piece: popular colours (5 bits a channel), merged to MAX_COLORS. */
const reduce = (cells: (Rgb | null)[][]): Rgb[] => {
  const counts = new Map<string, { c: Rgb; n: number }>();
  for (const row of cells) {
    for (const c of row) {
      if (!c) continue;
      const q: Rgb = [c[0] & 0xf8, c[1] & 0xf8, c[2] & 0xf8];
      const key = q.join(",");
      const e = counts.get(key);
      if (e) e.n++;
      else counts.set(key, { c: q, n: 1 });
    }
  }
  const picked: Rgb[] = [];
  for (const { c } of [...counts.values()].sort((a, b) => b.n - a.n)) {
    if (picked.length >= MAX_COLORS) break;
    if (picked.every((p) => dist(p, c) > 900)) picked.push(c);
  }
  return picked.length ? picked : [[128, 128, 128]];
};

const nearest = (palette: Rgb[], c: Rgb): string => {
  let best = 0;
  palette.forEach((p, i) => {
    if (dist(p, c) < dist(palette[best], c)) best = i;
  });
  return KEYS[best];
};

/** Places the piece on a frame with room to move: feet on the bottom row, centred. */
const frameOf = (base: Grid, w: number, h: number): string[][] => {
  const out = Array.from({ length: h }, () => Array.from({ length: w }, () => "."));
  const bw = base[0].length;
  const ox = Math.floor((w - bw) / 2);
  const oy = h - 1 - base.length;
  base.forEach((row, y) => {
    for (let x = 0; x < bw; x++) if (row[x] !== ".") out[oy + y][ox + x] = row[x];
  });
  return out;
};

interface Pose {
  /** Lean in pixels at the top of the piece (+ forward, toward the facing side). */
  lean: number;
  /** Height scale (1 = as on the board). */
  scale: number;
  /** Whole-piece offset. */
  dx: number;
  dy: number;
}

const POSES: Record<FrameId, Pose> = {
  idle0: { lean: 0, scale: 1, dx: 0, dy: 0 },
  idle1: { lean: 0, scale: 0.97, dx: 0, dy: 0 },
  walk0: { lean: 2, scale: 1, dx: 0, dy: 0 },
  walk1: { lean: 3, scale: 1.02, dx: 0, dy: -2 },
  walk2: { lean: 2, scale: 0.97, dx: 0, dy: 0 },
  walk3: { lean: 1, scale: 1.02, dx: 0, dy: -1 },
  guard: { lean: -2, scale: 0.95, dx: -1, dy: 0 },
  windup: { lean: -6, scale: 0.92, dx: -2, dy: 0 },
  attack0: { lean: 8, scale: 1.04, dx: 3, dy: 0 },
  attack1: { lean: 5, scale: 0.94, dx: 4, dy: 0 },
  hit: { lean: -7, scale: 0.96, dx: -3, dy: 0 },
  crouch: { lean: 0, scale: 0.82, dx: 0, dy: 0 },
  air: { lean: 3, scale: 1.08, dx: 0, dy: 0 },
  victory0: { lean: 0, scale: 1.05, dx: 0, dy: 0 },
  victory1: { lean: 0, scale: 1.12, dx: 0, dy: 0 },
  special: { lean: 2, scale: 0.86, dx: 0, dy: 0 },
};

/** Applies a pose: rows resampled to the new height from the feet up, each row shifted by the lean. */
const posed = (base: Grid, w: number, h: number, p: Pose): Grid => {
  const bh = base.length;
  const nh = Math.max(4, Math.min(h - 1, Math.round(bh * p.scale)));
  const rows: string[] = [];
  for (let y = 0; y < nh; y++) rows.push(base[Math.min(bh - 1, Math.floor((y * bh) / nh))]);
  const out = frameOf(rows.map((r) => ".".repeat(r.length)), w, h);
  const bw = base[0].length;
  const ox = Math.floor((w - bw) / 2) + p.dx;
  const oy = h - 1 - nh + p.dy;
  rows.forEach((row, y) => {
    const shiftX = Math.round((p.lean * (nh - 1 - y)) / Math.max(1, nh - 1));
    for (let x = 0; x < bw; x++) {
      const tx = ox + x + shiftX;
      const ty = oy + y;
      if (row[x] !== "." && tx >= 0 && tx < w && ty >= 0 && ty < h) out[ty][tx] = row[x];
    }
  });
  return outline(out);
};

/** A dark 1px outline round the piece, as the hand-drawn sprites have. */
const outline = (cells: string[][]): Grid => {
  const h = cells.length;
  const w = cells[0].length;
  const inked = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && cells[y][x] !== "." && cells[y][x] !== "o";
  const out = cells.map((r) => r.slice());
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (cells[y][x] !== ".") continue;
      if (inked(x - 1, y) || inked(x + 1, y) || inked(x, y - 1) || inked(x, y + 1)) out[y][x] = "o";
    }
  }
  return out.map((r) => r.join(""));
};

const cache = new Map<string, SpriteSheet>();

/** The duel sheet of `unit` in chessmen set `style` (built once per set, colours and piece). */
export const styledSheet = (style: PieceStyle, paletteId: string, unit: Unit): SpriteSheet => {
  const key = `${style}-${paletteId}-${unit.owner}-${unit.type}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = pixelate(style, unit.type, unit);
  const w = base.grid[0].length + MARGIN * 2 + 2;
  const h = base.grid.length + HEADROOM + 2;
  const frames = Object.fromEntries(FRAME_IDS.map((id) => [id, posed(base.grid, w, h, POSES[id])])) as Record<FrameId, Grid>;
  const sheet: SpriteSheet = { w, h, foot: [Math.floor(w / 2), h - 2], frames, palette: base.palette };
  cache.set(key, sheet);
  return sheet;
};
