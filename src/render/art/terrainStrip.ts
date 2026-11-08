import Phaser from "phaser";
import type { Terrain } from "../../engine/types";
import { ELEVATION, TILE_H, TILE_W } from "../iso";
import { TILE_TEX_H, tileKey } from "./terrainArt";
import { decorKey } from "./decorArt";
import { world } from "./worlds/registry";

/** Strips per world and terrain; a world switch simply misses the cache. */
const cache = new Map<string, string>();

/** Headroom kept above the tile top, enough for each terrain's decor. */
const HEAD: Record<Terrain, number> = { flat: 8, forest: 46, swamp: 14, mountain: 56, desert: 26 };

const source = (scene: Phaser.Scene, key: string): CanvasImageSource | null => {
  if (!scene.textures.exists(key)) return null;
  return scene.textures.get(key).getSourceImage() as CanvasImageSource;
};

/** Two neighbouring board tiles (light and dark) of one terrain, as a data URL for the HUD. */
export const terrainStrip = (scene: Phaser.Scene, t: Terrain): string => {
  const id = `${world.id}:${t}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = TILE_W * 2 + 8;
  canvas.height = TILE_TEX_H;
  const g = canvas.getContext("2d")!;
  const lift = ELEVATION[t];
  const layers: [string, number][] = [];
  [true, false].forEach((light, i) => {
    const x = 4 + i * TILE_W;
    layers.push([tileKey(t, light, i), x]);
  });
  for (const [key, x] of layers) {
    const img = source(scene, key);
    if (img) g.drawImage(img, x, 0);
  }
  if (t !== "flat") {
    for (const side of ["back", "front"] as const) {
      layers.forEach(([, x], i) => {
        const img = source(scene, decorKey(side, t, i));
        if (img) g.drawImage(img, x, -lift);
      });
    }
  }
  // Crop away the empty headroom so the strip is mostly tile.
  const top = Math.max(0, TILE_TEX_H - TILE_H - 16 - HEAD[t] - lift);
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height - top;
  out.getContext("2d")!.drawImage(canvas, 0, -top);
  const url = out.toDataURL();
  cache.set(id, url);
  return url;
};
