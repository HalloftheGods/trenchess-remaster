import type { UnitType } from "../../../engine/types";
import type { Faction } from "../unitArt";
import { hare, owl } from "./beastsArtSmall";
import { bear, stag } from "./beastsArtLarge";
import { lion, lioness } from "./beastsArtCats";

type G = CanvasRenderingContext2D;

/**
 * "Toy Beasts": the animal kingdom as chibi vinyl figures. Big round heads, stubby bodies,
 * dot eyes and blush, matte-plastic shading with visible mould seams, each on a round display
 * base. Pastel natural fur shared by both armies; the army color lives on scarves, saddles,
 * capes, the shield, the crown jewels and the base rim.
 */
export const BEASTS: Record<UnitType, (g: G, f: Faction) => void> = {
  pawn: hare,
  knight: stag,
  bishop: owl,
  rook: bear,
  queen: lioness,
  king: lion,
};
