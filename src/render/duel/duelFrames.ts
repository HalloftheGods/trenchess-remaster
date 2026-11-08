import { PIXEL_H, PIXEL_W, type PixelGrid } from "../art/styles/pixelArtGrids";

/** Logical size of a duel sprite: the 16x25 chessman grid centred in a 32x40 cell, foot on the floor. */
export const DUEL_W = 32;
export const DUEL_H = 40;
const OX = (DUEL_W - PIXEL_W) / 2;
const OY = DUEL_H - PIXEL_H;

export type DuelFrame = "idle" | "lunge1" | "lunge2" | "hit";
export const DUEL_FRAMES: DuelFrame[] = ["idle", "lunge1", "lunge2", "hit"];

interface Lean {
  /** Whole-sprite shift to the right, in logical pixels. */
  shift: number;
  /** Extra shift at the head that tapers to zero at the feet: the lunge lean. */
  lean: number;
}

const LEANS: Record<DuelFrame, Lean> = {
  idle: { shift: 0, lean: 0 },
  lunge1: { shift: 2, lean: 1 },
  lunge2: { shift: 5, lean: 3 },
  hit: { shift: -1, lean: -1 },
};

const blank = (): string[] => Array.from({ length: DUEL_H }, () => ".".repeat(DUEL_W));

/**
 * Places the grid in the duel cell, shifted and leaned for `frame`. The result is a 32x40 grid
 * with the same legend, so the pixel palette paints it. Pixels pushed off the cell are dropped.
 */
export const frameGrid = (grid: PixelGrid, frame: DuelFrame): PixelGrid => {
  const { shift, lean } = LEANS[frame];
  const out = blank().map((row) => row.split(""));
  grid.forEach((row, y) => {
    const dx = OX + shift + Math.round((lean * (PIXEL_H - y)) / PIXEL_H);
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const tx = x + dx;
      if (ch === "." || tx < 0 || tx >= DUEL_W) continue;
      out[y + OY][tx] = ch;
    }
  });
  return out.map((row) => row.join(""));
};

/** The flash-white palette for the hit frame: every inked pixel white, the ground shadow kept. */
export const hitPalette = (palette: Record<string, string>): Record<string, string> => {
  const white: Record<string, string> = {};
  for (const key of Object.keys(palette)) white[key] = key === "z" ? palette[key] : "#ffffff";
  return white;
};
