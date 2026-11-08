import Phaser from "phaser";
import type { Terrain } from "../../engine/types";
import { TILE_W } from "../iso";
import { paint, rand } from "./canvas";
import { TILE_TEX_H, VARIANTS } from "./worlds/geometry";
import { recipe, world } from "./worlds/registry";

/** Standing decor (trees, peaks, reeds, towers...) behind and in front of the units, per world. */

type Side = "back" | "front";

/** Order fixes each terrain's seed, so the classic variants stay as they were. */
const DECORATED: Terrain[] = ["forest", "mountain", "swamp", "desert"];

export const decorKey = (side: Side, t: string, v: number): string => `decor-${world.id}-${side}-${t}-${v}`;

/** Paints every terrain's decor for the active world; terrains the world leaves bare get an empty texture. */
export const paintDecor = (scene: Phaser.Scene): void => {
  const w = recipe();
  for (const side of ["back", "front"] as Side[]) {
    DECORATED.forEach((t, ti) => {
      const fn = w[side][t];
      for (let v = 0; v < VARIANTS; v++) {
        paint(scene, decorKey(side, t, v), TILE_W, TILE_TEX_H, (g) => fn?.(g, rand(311 + ti * 13 + v * 5)));
      }
    });
  }
};
