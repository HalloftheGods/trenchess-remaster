import type { UnitType } from "../../../engine/types";
import type { Faction } from "../unitArt";
import { hare, owl } from "./beastsArtSmall";
import { bear, stag } from "./beastsArtLarge";
import { lion, lioness } from "./beastsArtCats";

type G = CanvasRenderingContext2D;

/**
 * "Beasts": the animal kingdom. Natural fur colors shared by both armies; the army color
 * lives on collars, saddles, tabards, stoles, capes and in the eyes.
 */
export const BEASTS: Record<UnitType, (g: G, f: Faction) => void> = {
  pawn: hare,
  knight: stag,
  bishop: owl,
  rook: bear,
  queen: lioness,
  king: lion,
};
