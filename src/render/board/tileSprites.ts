import Phaser from "phaser";
import type { Terrain } from "../../engine/types";
import { LAYER, depthOf, getProjection, liftOf, toScreen, ySquash, type Projection } from "../iso";
import { TILE_ORIGIN_Y, VARIANTS, tileKey, tileTopKey } from "../art/terrainArt";
import { decorKey } from "../art/decorArt";

/** The sprites that make up one board cell and the per-projection rules for dressing them. */

export interface TileSprites {
  tile: Phaser.GameObjects.Image;
  back: Phaser.GameObjects.Image;
  front: Phaser.GameObjects.Image;
  fog: Phaser.GameObjects.Image;
  shimmer: Phaser.Tweens.Tween | null;
  glint: Phaser.GameObjects.Image;
  terrain: Terrain;
}

export interface TileMove {
  obj: Phaser.GameObjects.Image;
  y: number;
  layer: number;
}

export const variantOf = (r: number, c: number): number => (r * 7 + c * 13) % VARIANTS;

export const isLight = (r: number, c: number): boolean => (r + c) % 2 === 0;

export const fogKey = (p: Projection): string => (p === "iso" ? "fog" : "fog-top");

export const createTile = (scene: Phaser.Scene, r: number, c: number): TileSprites => {
  const { x, y } = toScreen(r, c);
  const tile = scene.add.image(x, y, tileKey("flat", true, 0)).setDepth(depthOf(r, c, LAYER.tile));
  const back = scene.add.image(x, y, "__DEFAULT").setOrigin(0.5, TILE_ORIGIN_Y).setDepth(depthOf(r, c, LAYER.backDecor)).setVisible(false);
  const front = scene.add.image(x, y, "__DEFAULT").setOrigin(0.5, TILE_ORIGIN_Y).setDepth(depthOf(r, c, LAYER.frontDecor)).setVisible(false);
  const fog = scene.add.image(x, y, fogKey(getProjection())).setDepth(depthOf(r, c, LAYER.fx)).setVisible(false);
  const glint = scene.add.image(x, y, "glow").setBlendMode("ADD").setTint(0x9fffe0).setAlpha(0).setDepth(depthOf(r, c, LAYER.marker)).setVisible(false);
  const s: TileSprites = { tile, back, front, fog, glint, shimmer: null, terrain: "flat" };
  dress(s, r, c, getProjection());
  return s;
};

/** Swap textures, origins and decor visibility so the cell reads correctly in the given projection. */
export const dress = (s: TileSprites, r: number, c: number, p: Projection): void => {
  const v = variantOf(r, c);
  const t = s.terrain;
  const squash = ySquash();
  if (p !== "iso") {
    // in the front view forests and peaks stand up as decor, so their ground is plain
    const ground = p === "front" && (t === "forest" || t === "mountain") ? "flat" : t;
    s.tile.setTexture(tileTopKey(ground, isLight(r, c), v)).setOrigin(0.5, 0.5).setScale(1, squash);
    s.glint.setScale(0.8, 0.8 * squash);
  } else {
    s.tile.setTexture(tileKey(t, isLight(r, c), v)).setOrigin(0.5, TILE_ORIGIN_Y).setScale(1, 1);
    s.glint.setScale(1, 0.35);
  }
  s.fog.setTexture(fogKey(p)).setScale(1, p === "iso" ? 1 : squash);
  // the front view keeps the standing decor so the table reads in depth; the top view lets the tile carry it
  const decorated = t !== "flat" && p !== "top";
  if (p === "front") {
    s.back.setOrigin(0.5, 1).setScale(0.9);
    s.front.setOrigin(0.5, 1).setScale(0.9);
  } else {
    s.back.setOrigin(0.5, TILE_ORIGIN_Y).setScale(1);
    s.front.setOrigin(0.5, TILE_ORIGIN_Y).setScale(1);
  }
  s.back.setVisible(decorated);
  s.front.setVisible(decorated);
  if (decorated) {
    s.back.setTexture(decorKey("back", t, v));
    s.front.setTexture(decorKey("front", t, v));
  }
};

/** Where each sprite of the cell belongs in the current projection. */
export const movesFor = (s: TileSprites, r: number, c: number, out: TileMove[]): number => {
  const { x, y } = toScreen(r, c);
  const lift = liftOf(s.terrain);
  out[0].obj = s.tile;
  out[0].y = y;
  out[0].layer = LAYER.tile;
  const foot = getProjection() === "front" ? TOP_TILE_HALF * ySquash() - 3 : 0;
  out[1].obj = s.back;
  out[1].y = y - lift + foot;
  out[1].layer = LAYER.backDecor;
  out[2].obj = s.front;
  out[2].y = y - lift + foot;
  out[2].layer = LAYER.frontDecor;
  out[3].obj = s.fog;
  out[3].y = y - lift;
  out[3].layer = LAYER.fx;
  out[4].obj = s.glint;
  out[4].y = y - lift;
  out[4].layer = LAYER.marker;
  return x;
};

export const MOVE_SLOTS = 5;

const TOP_TILE_HALF = 32;
