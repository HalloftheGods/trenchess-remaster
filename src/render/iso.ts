import type { Terrain } from "../engine/types";
import { BOARD_SIZE } from "../engine/rules";

export const TILE_W = 84;
export const TILE_H = 42;
export const SLAB = 16;
export const HEADROOM = 72;
/** Side of one square in the classic straight-on ("top") projection. */
export const TOP_TILE = 64;
/** In top view a unit's foot sits this far below the square's centre so it reads as standing on it. */
export const TOP_STAND = 14;

export const ELEVATION: Record<Terrain, number> = {
  flat: 0,
  forest: 2,
  swamp: -5,
  mountain: 18,
  desert: 1,
};

/** iso: the diorama; top: the classic straight-on board; front: the table seen from the front, rows receding upward. */
export type Projection = "iso" | "top" | "front";
/** How much the front view squashes the board vertically. */
export const FRONT_SQUASH = 0.58;

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface BoardBounds {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

/** Read at call time: the board can switch between Classic 8×8 and Extended 12×12. */
const last = (): number => BOARD_SIZE - 1;
const mid = (): number => last() / 2;

let rotation = 0;
let projection: Projection = "iso";

export const getRotation = (): number => rotation;

export const setRotation = (quarterTurns: number): void => {
  rotation = ((quarterTurns % 4) + 4) % 4;
};

export const getProjection = (): Projection => projection;

export const setProjection = (p: Projection): void => {
  projection = p;
};

/** True for the square-grid projections (top and front), which share the top-down tile art. */
export const isSquare = (): boolean => projection !== "iso";

/** Vertical squash of the square grid: 1 in top view, FRONT_SQUASH in the front view. */
export const ySquash = (): number => (projection === "front" ? FRONT_SQUASH : 1);

/** Vertical lift of a terrain's surface in the current projection (top view is flat). */
export const liftOf = (t: Terrain): number => {
  if (projection === "top") return 0;
  if (projection === "front") return ELEVATION[t] * 0.7;
  return ELEVATION[t];
};

/** How far below the cell centre a unit's foot stands in the current projection. */
export const standOffset = (): number => (projection === "iso" ? 0 : TOP_STAND * ySquash());

const rotate = (r: number, c: number, turns: number): [number, number] => {
  let vr = r;
  let vc = c;
  for (let i = 0; i < turns; i++) [vr, vc] = [vc, last() - vr];
  return [vr, vc];
};

export const toView = (r: number, c: number): [number, number] => rotate(r, c, rotation);

export const toScreen = (r: number, c: number): ScreenPoint => {
  const [vr, vc] = toView(r, c);
  if (projection !== "iso") return { x: (vc - mid()) * TOP_TILE, y: (vr - mid()) * TOP_TILE * ySquash() };
  return { x: (vc - vr) * (TILE_W / 2), y: (vc + vr) * (TILE_H / 2) };
};

const unrotate = (vr: number, vc: number): [number, number] => rotate(vr, vc, (4 - rotation) % 4);

export const toCell = (x: number, y: number): [number, number] => {
  if (projection !== "iso") return unrotate(Math.round(y / (TOP_TILE * ySquash()) + mid()), Math.round(x / TOP_TILE + mid()));
  const a = x / (TILE_W / 2);
  const b = y / (TILE_H / 2);
  return unrotate(Math.round((b - a) / 2), Math.round((a + b) / 2));
};

export const depthOf = (r: number, c: number, layer: number): number => {
  const [vr, vc] = toView(r, c);
  if (projection !== "iso") return vr * 10 + layer;
  return (vr + vc) * 10 + layer;
};

/** World-space footprint of the board's surface in the current projection. */
export const boardBounds = (): BoardBounds => {
  const n = BOARD_SIZE;
  if (projection !== "iso") return { centerX: 0, centerY: 0, width: n * TOP_TILE, height: n * TOP_TILE * ySquash() };
  return { centerX: 0, centerY: mid() * TILE_H, width: n * TILE_W, height: n * TILE_H };
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
