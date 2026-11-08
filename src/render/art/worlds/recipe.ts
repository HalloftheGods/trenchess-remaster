import type { Terrain } from "../../../engine/types";
import type { Rng } from "./geometry";

/** Everything a world needs to restyle the diorama; the painters read the active recipe. */

export interface TilePalette {
  top: string;
  side: string;
  speck: string;
}

export interface TopPalette {
  light: string;
  dark: string;
  detail: string;
  shadow: string;
}

/** Detail on the iso tile's diamond top; `cy` is the (lifted) centre of the face. */
export type SurfacePainter = (g: CanvasRenderingContext2D, cx: number, cy: number, r: Rng) => void;
/** Detail on a square top-down tile. */
export type TopPainter = (g: CanvasRenderingContext2D, p: TopPalette, r: Rng) => void;
/** Standing decor on a TILE_W × TILE_TEX_H canvas, around (CX, CY). */
export type DecorPainter = (g: CanvasRenderingContext2D, r: Rng) => void;

export interface SunSpec {
  /** Position as fractions of the dome's width and height. */
  x: number;
  y: number;
  glow: string;
  core: string;
  /** Radius of the glow as a fraction of the dome's width. */
  spread: number;
}

export interface SkySpec {
  stops: [number, string][];
  sun: SunSpec | null;
  /** Horizon haze band colour (rgba with the desired peak alpha). */
  haze: string;
  /** Count of stars in the 256×256 star tile. */
  stars: number;
  starColor: string;
  /** Far, mid and near ridge colours, then the fade over them. */
  peaks: [string, string, string, string];
  /** Ground gradient below the horizon: near colour, far colour. */
  ground: [number, number];
  /** Tint of the additive haze glow behind the plinth. */
  glow: number;
  /** Aurora curtain colour painted over the dome, or null. */
  aurora: string | null;
}

export interface PlinthMaterial {
  lit: string;
  dim: string;
  sideLeft: string;
  sideRight: string;
  rosette: string;
  groove: string;
  ridge: string;
}

export interface WorldRecipe {
  tiles: Record<Terrain, TilePalette>;
  tops: Record<Terrain, TopPalette>;
  surface: Record<Terrain, SurfacePainter>;
  topDetail: Record<Terrain, TopPainter>;
  back: Partial<Record<Terrain, DecorPainter>>;
  front: Partial<Record<Terrain, DecorPainter>>;
  sky: SkySpec;
  plinth: PlinthMaterial;
}

export const TERRAINS: Terrain[] = ["flat", "forest", "swamp", "mountain", "desert"];
