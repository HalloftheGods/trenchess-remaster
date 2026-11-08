import { HEADROOM, SLAB, TILE_H, TILE_W, TOP_TILE } from "../../iso";

/** Shared canvas geometry for every tile, decor and top-down painter. */

export const TILE_TEX_H = HEADROOM + TILE_H + SLAB + 4;
export const TILE_ORIGIN_Y = (HEADROOM + TILE_H / 2) / TILE_TEX_H;
export const VARIANTS = 3;
export const TOP_VARIANTS = 3;

/** Centre of the iso tile's unlifted top face inside its texture. */
export const CX = TILE_W / 2;
export const CY = HEADROOM + TILE_H / 2;

/** Side of a square top-down tile texture. */
export const S = TOP_TILE;

export type Rng = () => number;
