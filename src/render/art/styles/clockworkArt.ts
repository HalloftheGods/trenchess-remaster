import type { UnitType } from "../../../engine/types";
import type { Faction } from "../unitArt";
import { LEGION } from "../legionArt";

type G = CanvasRenderingContext2D;

// Placeholder until the clockwork set is painted: falls back to the figurine set.
export const CLOCKWORK: Record<UnitType, (g: G, f: Faction) => void> = { ...LEGION };
