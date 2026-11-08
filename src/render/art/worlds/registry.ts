import { CLASSIC } from "./classic";
import { FRONTIER } from "./frontier";
import { JUNGLE } from "./jungle";
import { NEON } from "./neon";
import type { WorldRecipe } from "./recipe";
import { TUNDRA } from "./tundra";
import { VOLCANIC } from "./volcanic";

/**
 * The selectable terrain worlds. A world restyles the five terrain types (the lore names stay);
 * every terrain, decor, sky and plinth texture key carries `world.id` so switching repaints live.
 */

export type WorldId = "classic" | "neon" | "frontier" | "tundra" | "jungle" | "volcanic";

export const WORLD_ORDER: WorldId[] = ["classic", "neon", "frontier", "tundra", "jungle", "volcanic"];

export const WORLD_LABELS: Record<WorldId, string> = {
  classic: "Classic",
  neon: "Neon City",
  frontier: "Frontier",
  tundra: "Tundra",
  jungle: "Jungle",
  volcanic: "Volcanic",
};

export const WORLD_TAGLINES: Record<WorldId, string> = {
  classic: "The Trench as it has always been: woods, marsh, peaks and dunes.",
  neon: "A city that never sleeps. Holograms, toxic pools and glass towers.",
  frontier: "The old west. Prairie, pine stands, red mesas and bleached bones.",
  tundra: "Frozen lakes and snowy firs under the aurora.",
  jungle: "Vines, lilies and mossy temple steps in the steaming green.",
  volcanic: "Basalt, embers and lava under a sky of red smoke.",
};

const RECIPES: Record<WorldId, WorldRecipe> = {
  classic: CLASSIC,
  neon: NEON,
  frontier: FRONTIER,
  tundra: TUNDRA,
  jungle: JUNGLE,
  volcanic: VOLCANIC,
};

const KEY = "trenchess-world";

export const isWorldId = (id: unknown): id is WorldId => typeof id === "string" && id in RECIPES;

const load = (): WorldId => {
  try {
    const saved = localStorage.getItem(KEY);
    return isWorldId(saved) ? saved : "classic";
  } catch {
    return "classic";
  }
};

/** The active world; read `world.id` when building texture keys. */
export const world: { id: WorldId } = { id: load() };

/** The active world's recipe. */
export const recipe = (): WorldRecipe => RECIPES[world.id];

/** Switch worlds and remember the choice; callers repaint the textures afterwards. */
export const applyWorld = (id: WorldId): void => {
  world.id = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    return;
  }
};
