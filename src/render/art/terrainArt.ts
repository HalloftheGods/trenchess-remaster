import Phaser from "phaser";
import type { Terrain } from "../../engine/types";
import { ELEVATION, SLAB, TILE_H, TILE_W } from "../iso";
import { diamondPath, paint, rand, shade } from "./canvas";
import { paintTerrainTop } from "./terrainTopArt";
import { CX, CY, TILE_TEX_H, VARIANTS } from "./worlds/geometry";
import { TERRAINS, type TilePalette } from "./worlds/recipe";
import { recipe, world } from "./worlds/registry";

export { tileTopKey, TOP_VARIANTS } from "./terrainTopArt";
export { TILE_TEX_H, TILE_ORIGIN_Y, VARIANTS } from "./worlds/geometry";

/** Iso tile textures: a lifted diamond top with the active world's surface detail over two slab sides. */

const drawSides = (g: CanvasRenderingContext2D, top: number, p: TilePalette): void => {
  const bottom = CY + SLAB;
  g.beginPath();
  g.moveTo(CX - TILE_W / 2, top);
  g.lineTo(CX, top + TILE_H / 2);
  g.lineTo(CX, bottom + TILE_H / 2);
  g.lineTo(CX - TILE_W / 2, bottom);
  g.closePath();
  g.fillStyle = shade(p.side, -0.08);
  g.fill();
  g.beginPath();
  g.moveTo(CX + TILE_W / 2, top);
  g.lineTo(CX, top + TILE_H / 2);
  g.lineTo(CX, bottom + TILE_H / 2);
  g.lineTo(CX + TILE_W / 2, bottom);
  g.closePath();
  g.fillStyle = shade(p.side, 0.04);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.18)";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(CX, top + TILE_H / 2);
  g.lineTo(CX, bottom + TILE_H / 2);
  g.stroke();
};

const speckle = (g: CanvasRenderingContext2D, cy: number, color: string, count: number, r: () => number): void => {
  g.save();
  diamondPath(g, CX, cy, TILE_W - 2, TILE_H - 1);
  g.clip();
  g.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = CX + (r() - 0.5) * TILE_W;
    const y = cy + (r() - 0.5) * TILE_H;
    g.globalAlpha = 0.25 + r() * 0.5;
    g.fillRect(x, y, 1 + r() * 2, 1 + r() * 1.5);
  }
  g.restore();
};

const drawTile = (terrain: Terrain, light: boolean, seed: number) => (g: CanvasRenderingContext2D) => {
  const w = recipe();
  const p = w.tiles[terrain];
  const elev = ELEVATION[terrain];
  const top = CY - elev;
  const r = rand(seed);
  drawSides(g, top, p);
  diamondPath(g, CX, top, TILE_W, TILE_H);
  // warm key light from the upper-left: lit corner brighter, far corner cooler
  const grad = g.createLinearGradient(CX - TILE_W / 2, top - TILE_H / 2, CX + TILE_W / 2, top + TILE_H / 2);
  const base = light ? 0.06 : -0.13;
  grad.addColorStop(0, shade(p.top, base + 0.05));
  grad.addColorStop(1, shade(p.top, base - 0.06));
  g.fillStyle = grad;
  g.fill();
  speckle(g, top, p.speck, 40, r);
  g.save();
  diamondPath(g, CX, top, TILE_W - 2, TILE_H - 1);
  g.clip();
  w.surface[terrain](g, CX, top, r);
  g.restore();
  diamondPath(g, CX, top, TILE_W, TILE_H);
  g.strokeStyle = "rgba(255,255,255,0.10)";
  g.lineWidth = 1;
  g.stroke();
};

export const tileKey = (t: Terrain, light: boolean, v: number): string => `tile-${world.id}-${t}-${light ? "l" : "d"}-${v}`;

/** Paints the active world's tiles (both projections); already-painted worlds are skipped. */
export const paintTerrain = (scene: Phaser.Scene): void => {
  paintTerrainTop(scene);
  TERRAINS.forEach((t, ti) => {
    for (let v = 0; v < VARIANTS; v++) {
      for (const light of [true, false]) {
        paint(scene, tileKey(t, light, v), TILE_W, TILE_TEX_H, drawTile(t, light, 97 + ti * 31 + v * 7 + (light ? 1 : 0)));
      }
    }
  });
};
