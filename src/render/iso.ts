import type { Terrain } from "../engine/types";
import { BOARD_SIZE } from "../engine/rules";

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

let rotation = 0;

export const getRotation = (): number => rotation;

export const setRotation = (quarterTurns: number): void => {
  rotation = ((quarterTurns % 4) + 4) % 4;
};

const rotate = (r: number, c: number, turns: number): [number, number] => {
  let vr = r;
  let vc = c;
  for (let i = 0; i < turns; i++) [vr, vc] = [vc, BOARD_SIZE - 1 - vr];
  return [vr, vc];
};

export const toView = (r: number, c: number): [number, number] => rotate(r, c, rotation);

export const toScreen = (r: number, c: number): ScreenPoint => {
  const [vr, vc] = toView(r, c);
  return { x: (vc - vr) * (TILE_W / 2), y: (vc + vr) * (TILE_H / 2) };
};

export const toCell = (x: number, y: number): [number, number] => {
  const a = x / (TILE_W / 2);
  const b = y / (TILE_H / 2);
  return rotate(Math.round((b - a) / 2), Math.round((a + b) / 2), (4 - rotation) % 4);
};

export const depthOf = (r: number, c: number, layer: number): number => {
  const [vr, vc] = toView(r, c);
  return (vr + vc) * 10 + layer;
};

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
