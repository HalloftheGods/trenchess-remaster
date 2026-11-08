import { drawGrid, type Grid } from "./sheet";
import type { Palette } from "./palette";

/** Internal duel screen: the whole battle is drawn at this height and scaled up with nearest sampling. */
export const SCREEN_H = 180;
/** Width of one backdrop tile; layers repeat horizontally, so every shape must wrap at TILE_W. */
export const TILE_W = 320;
/** Row the fighters stand on. Ground should read clearly from about y=118 down to the bottom. */
export const FLOOR_Y = 140;

/** 4x4 Bayer matrix: ordered dithering thresholds 0..15. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * Pixel-exact drawing for backdrops: no anti-aliasing anywhere, x wraps around TILE_W so shapes
 * crossing the seam tile cleanly, and ordered dithering for gradients. Colours are CSS hex.
 */
export class PixelPainter {
  readonly w: number;
  readonly h: number;
  private seed: number;

  constructor(private g: CanvasRenderingContext2D, w = TILE_W, h = SCREEN_H, seed = 1) {
    this.w = w;
    this.h = h;
    this.seed = seed;
  }

  /** Seeded random in [0, 1). */
  rand(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  /** Reseeds the generator (use per layer for stable art). */
  reseed(seed: number): void {
    this.seed = seed % 2147483647 || 1;
  }

  px(x: number, y: number, c: string): void {
    const yy = Math.floor(y);
    if (yy < 0 || yy >= this.h) return;
    const xx = ((Math.floor(x) % this.w) + this.w) % this.w;
    this.g.fillStyle = c;
    this.g.fillRect(xx, yy, 1, 1);
  }

  rect(x: number, y: number, w: number, h: number, c: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }

  hline(x: number, y: number, len: number, c: string): void {
    for (let i = 0; i < len; i++) this.px(x + i, y, c);
  }

  vline(x: number, y: number, len: number, c: string): void {
    for (let j = 0; j < len; j++) this.px(x, y + j, c);
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, c: string): void {
    let [x, y] = [Math.round(x0), Math.round(y0)];
    const [tx, ty] = [Math.round(x1), Math.round(y1)];
    const dx = Math.abs(tx - x);
    const dy = -Math.abs(ty - y);
    const sx = x < tx ? 1 : -1;
    const sy = y < ty ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x, y, c);
      if (x === tx && y === ty) return;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /** Filled pixel ellipse (a circle when rx = ry). */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): void {
    for (let y = -ry; y <= ry; y++) {
      const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry || 1))) + 0.35);
      this.hline(cx - half, cy + y, half * 2 + 1, c);
    }
  }

  disc(cx: number, cy: number, r: number, c: string): void {
    this.ellipse(cx, cy, r, r, c);
  }

  /** Fills `c` over the area with ordered dither at `level` 0..16 (0 none, 16 solid). */
  dither(x: number, y: number, w: number, h: number, c: string, level: number): void {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const xx = x + i;
        const yy = y + j;
        if (BAYER[((yy % 4) + 4) % 4][((xx % 4) + 4) % 4] < level) this.px(xx, yy, c);
      }
  }

  /**
   * Vertical gradient as hard colour bands between y0 and y1, with a dithered seam
   * `blend` pixels tall between each pair of colours.
   */
  bands(y0: number, y1: number, colors: string[], blend = 4): void {
    const n = colors.length;
    const step = (y1 - y0) / n;
    for (let i = 0; i < n; i++) this.rect(0, Math.round(y0 + i * step), this.w, Math.ceil(step) + 1, colors[i]);
    for (let i = 1; i < n; i++) {
      const seam = Math.round(y0 + i * step);
      for (let b = 0; b < blend; b++) this.dither(0, seam - blend + b, this.w, 1, colors[i], Math.round(((b + 1) / (blend + 1)) * 16));
    }
  }

  /** Fills every column x from `top(x)` down to `bottom` with `c`. */
  ridge(top: (x: number) => number, c: string, bottom = this.h): void {
    for (let x = 0; x < this.w; x++) {
      const t = Math.round(top(x));
      this.vline(x, t, bottom - t, c);
    }
  }

  /** Draws a palette grid (sprite legend or your own) at (x, y), wrapping horizontally. */
  stamp(grid: Grid, x: number, y: number, palette: Palette): void {
    grid.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === "." || !palette[ch]) continue;
        this.px(x + i, y + j, palette[ch]);
      }
    });
  }

  /** Low-level access for a grid at 1:1 without wrapping. */
  grid(grid: Grid, x: number, y: number, palette: Palette): void {
    drawGrid(this.g, grid, palette, x, y);
  }
}

/** A seamless horizontal wave: integer `n` cycles across the tile. */
export const wave = (x: number, n: number, phase = 0): number => Math.sin((Math.PI * 2 * n * x) / TILE_W + phase);
