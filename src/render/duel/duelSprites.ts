import Phaser from "phaser";
import type { Unit } from "../../engine/types";
import { paint } from "../art/canvas";
import { FACTIONS, theme } from "../art/unitArt";
import { PIXEL_GRIDS } from "../art/styles/pixelArtGrids";
import { paintGrid, pixelPalette } from "../art/styles/pixelArt";
import { DUEL_FRAMES, DUEL_H, DUEL_W, frameGrid, hitPalette, type DuelFrame } from "./duelFrames";

/** The 4x4 white square every duel particle is cut from. */
export const PX_KEY = "duel-px";

export const duelKey = (unit: Unit, frame: DuelFrame): string => `duel-${theme.palette}-${unit.owner}-${unit.type}-${frame}`;

const nearest = (scene: Phaser.Scene, key: string): void => {
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
};

/** Paints the four 32x40 frames of `unit` in the current palette (idempotent per palette). */
export const paintDuelUnit = (scene: Phaser.Scene, unit: Unit): void => {
  const palette = pixelPalette(FACTIONS[unit.owner]);
  const flash = hitPalette(palette);
  for (const frame of DUEL_FRAMES) {
    const key = duelKey(unit, frame);
    paint(scene, key, DUEL_W, DUEL_H, (g) => paintGrid(g, frameGrid(PIXEL_GRIDS[unit.type], frame), frame === "hit" ? flash : palette));
    nearest(scene, key);
  }
};

export const paintDuelParticle = (scene: Phaser.Scene): void => {
  paint(scene, PX_KEY, 4, 4, (g) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 4, 4);
  });
  nearest(scene, PX_KEY);
};
