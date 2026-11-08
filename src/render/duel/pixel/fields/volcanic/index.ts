import type { Terrain } from "../../../../../engine/types";
import type { Battlefield } from "../../field";
import flat from "./flat";
import forest from "./forest";
import swamp from "./swamp";
import mountain from "./mountain";
import desert from "./desert";

/** This world's duel battlefields; a terrain left out falls back to the Classic one. */
const FIELDS: Partial<Record<Terrain, Battlefield>> = { flat, forest, swamp, mountain, desert };

export default FIELDS;
