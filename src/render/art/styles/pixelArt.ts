import type { UnitType } from "../../../engine/types";
import type { Faction } from "../unitArt";
import { PIXEL_GRIDS, PIXEL_H, PIXEL_W, type PixelGrid } from "./pixelArtGrids";

type G = CanvasRenderingContext2D;

/** Logical pixel size: 16x25 grid scaled x4 fills the 64x100 unit canvas. */
export const PIXEL_SCALE = 4;

const OUTLINE = "#0c0a12";
const HIGHLIGHT = "#ffffff";
const SKIN = "#f0c29a";
const WOOD = "#8a5a2e";
const STEEL = "#d4d7de";
const STEEL_DARK = "#6d717c";
const SHADOW = "rgba(0,0,0,0.38)";

/** Maps a legend character to a CSS color for the given faction; "." is transparent. */
export const pixelPalette = (f: Faction): Record<string, string> => ({
  o: OUTLINE,
  h: HIGHLIGHT,
  b: f.base,
  l: f.light,
  d: f.dark,
  t: f.trim,
  s: SKIN,
  w: WOOD,
  m: STEEL,
  k: STEEL_DARK,
  z: SHADOW,
});

/** Paints a grid at 1 logical pixel = 1 canvas pixel. */
export const paintGrid = (g: G, grid: PixelGrid, palette: Record<string, string>): void => {
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      g.fillStyle = color;
      g.fillRect(x, y, 1, 1);
    }
  });
};

const logical = (grid: PixelGrid, f: Faction): HTMLCanvasElement => {
  const small = document.createElement("canvas");
  small.width = PIXEL_W;
  small.height = PIXEL_H;
  const sg = small.getContext("2d")!;
  paintGrid(sg, grid, pixelPalette(f));
  return small;
};

/** Draws one 16x25 grid scaled x4 with nearest-neighbour sampling for the chunky retro look. */
const blit = (grid: PixelGrid) => (g: G, f: Faction): void => {
  const small = logical(grid, f);
  g.save();
  g.imageSmoothingEnabled = false;
  g.drawImage(small, 0, 0, PIXEL_W * PIXEL_SCALE, PIXEL_H * PIXEL_SCALE);
  g.restore();
};

export const PIXEL: Record<UnitType, (g: G, f: Faction) => void> = {
  pawn: blit(PIXEL_GRIDS.pawn),
  knight: blit(PIXEL_GRIDS.knight),
  bishop: blit(PIXEL_GRIDS.bishop),
  rook: blit(PIXEL_GRIDS.rook),
  queen: blit(PIXEL_GRIDS.queen),
  king: blit(PIXEL_GRIDS.king),
};
