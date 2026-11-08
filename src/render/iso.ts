import type { Terrain } from "../engine/types";

export const TILE_W = 84;
export const TILE_H = 42;
export const SLAB = 16;
export const HEADROOM = 72;

export const ELEVATION: Record<Terrain, number> = {
  flat: 0,
  forest: 2,
  swamp: -5,
  mountain: 18,
  desert: 1,
};

export interface ScreenPoint {
  x: number;
  y: number;
}

export const toScreen = (r: number, c: number): ScreenPoint => ({
  x: (c - r) * (TILE_W / 2),
  y: (c + r) * (TILE_H / 2),
});

export const toCell = (x: number, y: number): [number, number] => {
  const a = x / (TILE_W / 2);
  const b = y / (TILE_H / 2);
  return [Math.round((b - a) / 2), Math.round((a + b) / 2)];
};

export const depthOf = (r: number, c: number, layer: number): number => (r + c) * 10 + layer;

export const LAYER = {
  tile: 0,
  marker: 1,
  backDecor: 2,
  shadow: 3,
  unit: 5,
  frontDecor: 7,
  fx: 9,
} as const;

export const TOP_LAYER = 1000;
