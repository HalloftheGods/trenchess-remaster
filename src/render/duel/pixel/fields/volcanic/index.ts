import type { Terrain } from "../../../../../engine/types";
import type { Battlefield } from "../../field";

/** This world's duel battlefields; a terrain left out falls back to the Classic one. */
const FIELDS: Partial<Record<Terrain, Battlefield>> = {};

export default FIELDS;
