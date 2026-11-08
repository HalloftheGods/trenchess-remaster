import type { Grid } from "./sheet";
import type { Palette } from "./palette";

/**
 * Pixel effect animations. Legend: W white, L light grey, D grey (W/L/D take the tint the game
 * gives them, so one spark serves gold, white or army colours), plus fixed colours
 * Y pale yellow, O orange, R red, G holy glow, B ice blue, o outline. '.' is transparent.
 */
export const FX_PALETTE: Palette = {
  W: "#ffffff",
  L: "#c4c4d0",
  D: "#7c7c8c",
  Y: "#fff08a",
  O: "#f89c30",
  R: "#e83c46",
  G: "#fff6c4",
  B: "#9cd8ff",
  o: "#140c1c",
};

export interface FxSheet {
  w: number;
  h: number;
  frames: Grid[];
}

/**
 *   spark   ~9x9, 4 frames: a hit spark bursting and fading
 *   slash   ~40x40, 3 frames: a crescent sword trail sweeping top-right to bottom (facing right)
 *   impact  ~32x32, 3 frames: the big hit burst (star of rays, then broken ring)
 *   dust    ~14x10, 4 frames: a puff of ground dust swelling and thinning
 *   glint   ~11x11, 2 frames: a four-point twinkle on a weapon
 *   ring    ~64x14, 3 frames: a flattened ground shockwave ellipse expanding
 *   shard   ~5x5, 2 frames: a tumbling fragment
 *   pillar  ~16x56, 3 frames: a stone spike erupting from the ground (grows, full, cracked)
 *   fence   ~28x30, 1 frame: a show-jumping triple bar (three rising striped rails on posts)
 *   rune    ~88x18, 2 frames: a flattened glowing diamond-in-circle rune on the ground
 *   cloud   ~16x10, 3 frames: a little white nimbus puff (the Nimbus Jumper's landing)
 *   beam    ~24x8, 1 frame: one horizontal slice of a vertical light beam (tiled downward)
 */
export type FxId = "spark" | "slash" | "impact" | "dust" | "glint" | "ring" | "shard" | "pillar" | "fence" | "rune" | "cloud" | "beam";

const blank = (w: number, h: number): Grid => Array.from({ length: h }, () => ".".repeat(w));
const dot = (w: number, h: number): Grid => blank(w, h).map((r, y) => (y === h >> 1 ? `${r.slice(0, w >> 1)}W${r.slice((w >> 1) + 1)}` : r));

/** Placeholder sheets; the authored ones replace these. */
export const FX: Record<FxId, FxSheet> = {
  spark: { w: 9, h: 9, frames: [dot(9, 9)] },
  slash: { w: 40, h: 40, frames: [dot(40, 40)] },
  impact: { w: 32, h: 32, frames: [dot(32, 32)] },
  dust: { w: 14, h: 10, frames: [dot(14, 10)] },
  glint: { w: 11, h: 11, frames: [dot(11, 11)] },
  ring: { w: 64, h: 14, frames: [dot(64, 14)] },
  shard: { w: 5, h: 5, frames: [dot(5, 5)] },
  pillar: { w: 16, h: 56, frames: [dot(16, 56)] },
  fence: { w: 28, h: 30, frames: [dot(28, 30)] },
  rune: { w: 88, h: 18, frames: [dot(88, 18)] },
  cloud: { w: 16, h: 10, frames: [dot(16, 10)] },
  beam: { w: 24, h: 8, frames: [dot(24, 8)] },
};
