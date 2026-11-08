# Task: world terrain themes

Owner handle: @worlds. Files you own: `src/render/art/terrainArt.ts`, `src/render/art/terrainTopArt.ts`,
`src/render/art/decorArt.ts`, `src/render/art/skyArt.ts`, `src/render/art/plinthArt.ts`,
new `src/render/art/worlds/*`, plus one row in `src/render/scenes/SetupScene.ts` (a "World"
carousel after "Board"; follow the existing `rows.row(...)` pattern) and the `ui:world` handler in
`src/main.ts` (`ev.on("ui:world", (id) => ...)`), and `src/render/art/terrainStrip.ts` if the HUD
strip needs the world's tiles.

Goal (Xopher): the terrain look should be selectable: "it could be a cyber city in the future, or
the old west, or other places around the world and various biomes. These are all options of
course." The current look stays the default.

Build `src/render/art/worlds/registry.ts`: `WorldId = "classic" | "neon" | "frontier" | "tundra" |
"jungle" | "volcanic"`, `WORLD_ORDER`, `WORLD_LABELS` (Classic, Neon City, Frontier, Tundra, Jungle,
Volcanic), `WORLD_TAGLINES`, `export const world = { id: WorldId }`, `applyWorld(id)` (persist in
localStorage `trenchess-world`), and a per-world palette/recipe object the painters read
(tile top colours light/dark per terrain, slab side colours, decor set, sky gradient + sun colour,
star density, plinth material). The classic lore names stay in the HUD info card (Whispering Woods,
Sunken Realm, Iron Peaks, Endless Sands are the *terrain types*; a world only restyles them).

How each world reads the four terrains (forest / swamp / mountain / desert / flat):
- Neon City: flat = dark asphalt grid with cyan lane lines; forest = holographic tree clusters /
  neon signage pylons; swamp = glowing toxic pools; mountain = glass skyscrapers with lit windows;
  desert = cracked concrete wasteland with sodium glow; sky = night with magenta/cyan haze.
- Frontier (old west): flat = dry prairie; forest = pine stands; swamp = muddy creek bends;
  mountain = red mesas; desert = sand with cacti and bleached bones; sky = amber dusk.
- Tundra: flat = snow; forest = snowy firs; swamp = frozen lake with cracks; mountain = icy
  peaks; desert = wind-scoured grey gravel; sky = pale blue with aurora.
- Jungle: flat = lush grass; forest = dense canopy with vines; swamp = murky green water with
  lilies; mountain = mossy stone temple steps; desert = dry riverbed clay; sky = humid green-gold.
- Volcanic: flat = black basalt; forest = charred trunks with embers; swamp = lava pools;
  mountain = obsidian spires with glowing cracks; desert = ash flats; sky = red smoke.

Texture keys must include the world id (e.g. `tile-${world.id}-...`) so `applyWorld` followed by
`paintTerrain(scene); paintDecor(scene); paintSky(scene); paintPlinth(scene)` and
`scene.board.setTerrain(scene.board.terrain)` repaints everything live from the setup panel; the
Backdrop/sky/plinth images need a `retexture()`/rebuild hook if they cache keys (add it, smallest
change, in `src/render/board/Backdrop.ts` is allowed for this). Both projections (iso tops and
`tileTopKey` square tops) need every world. Keep each painter file under ~250 lines: one file per
world under `src/render/art/worlds/` is the expected layout.

Done when: the World carousel in setup switches the whole diorama live, the choice persists, the
default is unchanged from today, and the chemx gate passes.
