import type { Terrain } from "../../../../engine/types";
import type { Battlefield } from "../field";
import flat from "./flat";
import forest from "./forest";
import swamp from "./swamp";
import mountain from "./mountain";
import desert from "./desert";

export const FIELDS: Record<Terrain, Battlefield> = { flat, forest, swamp, mountain, desert };
