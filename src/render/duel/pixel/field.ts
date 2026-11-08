import type { Terrain } from "../../../engine/types";
import type { PixelPainter } from "./painter";

export type AmbientKind = "pollen" | "leaves" | "fireflies" | "snow" | "sand" | "embers" | "rain" | "ash" | "motes" | "none";

/** One parallax layer of a battlefield: a TILE_W x SCREEN_H tile, transparent where it shows the layer behind. */
export interface PixelLayer {
  /** Movement per pixel the ground moves: sky ~0.05, far ~0.2, mid ~0.5, ground 1, foreground 1.4. */
  parallax: number;
  /** Drawn in front of the fighters (keep it to the bottom edge and the sides). */
  front?: boolean;
  /** Slow drift in px/s for clouds or mist (optional). */
  drift?: number;
  paint: (p: PixelPainter) => void;
}

export interface Battlefield {
  terrain: Terrain;
  /** Back to front. */
  layers: PixelLayer[];
  ambient: AmbientKind;
  /** Colours for the ambient particles (CSS hex). */
  ambientColors: string[];
}
