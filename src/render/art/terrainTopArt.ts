import Phaser from "phaser";
import type { Terrain } from "../../engine/types";
import { paint, rand, shade } from "./canvas";
import { S, TOP_VARIANTS } from "./worlds/geometry";
import { TERRAINS } from "./worlds/recipe";
import { recipe, world } from "./worlds/registry";

export { TOP_VARIANTS } from "./worlds/geometry";

/** Square, straight-on tile textures for the classic top-down projection, styled by the active world. */

/** Soft warm light from the upper-left over the whole square. */
const lightWash = (g: CanvasRenderingContext2D, base: string): void => {
  const grad = g.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, shade(base, 0.07));
  grad.addColorStop(1, shade(base, -0.07));
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
};

const bevel = (g: CanvasRenderingContext2D): void => {
  g.strokeStyle = "rgba(0,0,0,0.28)";
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, S - 1, S - 1);
  g.strokeStyle = "rgba(255,255,255,0.18)";
  g.beginPath();
  g.moveTo(1.5, S - 1.5);
  g.lineTo(1.5, 1.5);
  g.lineTo(S - 1.5, 1.5);
  g.stroke();
  g.strokeStyle = "rgba(0,0,0,0.2)";
  g.beginPath();
  g.moveTo(S - 1.5, 1.5);
  g.lineTo(S - 1.5, S - 1.5);
  g.lineTo(1.5, S - 1.5);
  g.stroke();
};

const drawTop = (t: Terrain, light: boolean, seed: number) => (g: CanvasRenderingContext2D) => {
  const w = recipe();
  const p = w.tops[t];
  const r = rand(seed);
  lightWash(g, light ? p.light : p.dark);
  g.save();
  g.beginPath();
  g.rect(0, 0, S, S);
  g.clip();
  w.topDetail[t](g, p, r);
  g.restore();
  bevel(g);
};

export const tileTopKey = (t: Terrain, light: boolean, v: number): string => `tile-top-${world.id}-${t}-${light ? "l" : "d"}-${v}`;

export const paintTerrainTop = (scene: Phaser.Scene): void => {
  TERRAINS.forEach((t, ti) => {
    for (let v = 0; v < TOP_VARIANTS; v++) {
      for (const light of [true, false]) {
        paint(scene, tileTopKey(t, light, v), S, S, drawTop(t, light, 503 + ti * 29 + v * 11 + (light ? 1 : 0)));
      }
    }
  });
};
