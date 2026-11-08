import { FRAME_IDS, fit, type FrameId, type Grid, type SpriteSheet } from "../sheet";
import { PIXEL_GRIDS } from "../../../art/styles/pixelArtGrids";

/** Placeholder: the old 16x25 8-bit chessman, recoloured to the duel legend. Replaced by the authored sheet. */
const MAP: Record<string, string> = {"o": "o", "h": "W", "b": "B", "l": "L", "d": "D", "t": "y", "s": "s", "w": "w", "m": "M", "k": "k", "z": "z", ".": "."};
const legacy: Grid = PIXEL_GRIDS.pawn.map((r) => r.split("").map((c) => MAP[c] ?? ".").join(""));
const frame: Grid = fit(legacy.map((r) => ".".repeat(20) + r), 56, 55);

const sheet: SpriteSheet = {
  w: 56,
  h: 55,
  foot: [28, 54],
  frames: Object.fromEntries(FRAME_IDS.map((id) => [id, frame])) as Record<FrameId, Grid>,
};

export default sheet;
