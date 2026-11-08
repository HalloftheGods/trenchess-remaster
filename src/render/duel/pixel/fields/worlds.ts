import type { Terrain } from "../../../../engine/types";
import type { WorldId } from "../../../art/worlds/registry";
import type { Battlefield } from "../field";
import { FIELDS } from "./index";
import frontier from "./frontier";
import jungle from "./jungle";
import neon from "./neon";
import tundra from "./tundra";
import volcanic from "./volcanic";

/** Each world's own duel battlefields (Classic is the original set). */
const WORLD_FIELDS: Record<WorldId, Partial<Record<Terrain, Battlefield>>> = { classic: FIELDS, neon, frontier, tundra, jungle, volcanic };

/** The battlefield for `terrain` in `world`, falling back to the Classic one where a world has none yet. */
export const fieldFor = (world: WorldId, terrain: Terrain): Battlefield => WORLD_FIELDS[world][terrain] ?? FIELDS[terrain];
