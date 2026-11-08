import Phaser from "phaser";
import { BOARD_SIZE } from "../../engine/rules";
import { LAYER, TILE_H, TILE_W, TOP_LAYER, TOP_TILE, boardBounds, depthOf, getProjection } from "../iso";
import type { BoardView } from "./BoardView";

/**
 * Warm key light from the upper-left plus soft ambient-occlusion blobs:
 * along the board's outer edge (the tiles' contact shadow) and under every mountain.
 */
export class Lighting {
  private blobs: Phaser.GameObjects.Image[] = [];
  private warm: Phaser.GameObjects.Image;
  private cool: Phaser.GameObjects.Image;

  constructor(private scene: Phaser.Scene) {
    this.warm = scene.add.image(0, 0, "light-warm").setBlendMode("ADD").setDepth(TOP_LAYER - 40).setAlpha(0.55);
    this.cool = scene.add.image(0, 0, "cloud").setTint(0x1a2440).setDepth(TOP_LAYER - 41).setAlpha(0.28);
    this.placeLights();
  }

  private placeLights(): void {
    const b = boardBounds();
    const top = getProjection() === "top";
    this.warm.setPosition(b.centerX - b.width * 0.42, b.centerY - b.height * 0.42).setScale(top ? 3.4 : 4.6, top ? 3.4 : 2.8);
    this.cool.setPosition(b.centerX + b.width * 0.4, b.centerY + b.height * 0.4).setScale(top ? 3.6 : 5.2, top ? 3.6 : 3.2);
  }

  /** Rebuild the occlusion blobs for the board's terrain and the current projection. */
  rebuild(board: BoardView): void {
    this.blobs.forEach((b) => b.destroy());
    this.blobs = [];
    this.placeLights();
    const top = getProjection() === "top";
    const sx = top ? TOP_TILE / 256 : TILE_W / 256;
    const sy = top ? TOP_TILE / 128 : TILE_H / 128;
    const b = boardBounds();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const edge = r === 0 || c === 0 || r === BOARD_SIZE - 1 || c === BOARD_SIZE - 1;
        const mountain = board.terrainAt(r, c) === "mountain";
        if (!edge && !mountain) continue;
        const { x, y } = board.center(r, c);
        if (edge) {
          const dx = x - b.centerX;
          const dy = y - b.centerY;
          const len = Math.hypot(dx, dy) || 1;
          const push = top ? TOP_TILE * 0.55 : TILE_H * 0.7;
          const ox = (dx / len) * push;
          const oy = (dy / len) * push * (top ? 1 : 0.5);
          this.blob(x + ox, y + oy, sx * 1.4, sy * 1.4, 0.15, depthOf(r, c, LAYER.marker));
        }
        if (mountain) {
          const ox = top ? 8 : TILE_W * 0.26;
          const oy = top ? 8 : TILE_H * 0.5;
          this.blob(x + ox, y + oy, sx * 1.3, sy * 1.4, 0.2, depthOf(r, c, LAYER.marker) + 10);
        }
      }
    }
  }

  private blob(x: number, y: number, sx: number, sy: number, alpha: number, depth: number): void {
    this.blobs.push(this.scene.add.image(x, y, "cloud").setScale(sx, sy).setAlpha(alpha).setDepth(depth));
  }

  /** Fade the occlusion out for a view morph; `rebuild` brings it back for the new layout. */
  dim(duration: number): void {
    if (this.blobs.length) this.scene.tweens.add({ targets: this.blobs, alpha: 0, duration: duration / 2 });
  }
}
