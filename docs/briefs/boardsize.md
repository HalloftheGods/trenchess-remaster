# Task: render the Classic 8×8 board

Owner handle: @board. Files you own: `src/render/iso.ts`, `src/render/board/BoardView.ts`,
`src/render/board/Lighting.ts`, `src/render/board/Ambient.ts`, `src/render/board/Backdrop.ts`,
`src/render/art/plinthArt.ts`, `src/render/scenes/battle/BattleView.ts`, `src/game/fields.ts`,
`src/engine/presets.ts` (only the module-load BOARD_SIZE issue), and the `BOARDS` choices in
`src/render/scenes/setup/choices.ts` (enable "classic").

Context: the engine already supports two boards (`src/engine/rules.ts`: `BoardKind`, `BOARDS`,
live `let BOARD_SIZE`/`TERRAIN_QUOTA`, `setBoard(kind)`), `MatchOptions.board` exists, and
`Match.preview/start` call `setBoard`. The renderer still assumes 12: `iso.ts` hard-codes
`LAST = 11`/`MID`, `boardBounds` uses 12, `BoardView` builds 12×12 tiles once, `plinthArt` paints a
12-wide plinth, Lighting/Ambient loop `BOARD_SIZE` but are built once.

Build: everything reads `BOARD_SIZE` at call time (never cache at module load; `presets.ts` has a
module-load `MID` — make presets stay 12×12 but compute lazily or document that presets are
Extended-only). `BoardView` gets `rebuild()` that destroys and recreates tiles when the size
changed (call it from `setTerrain` when `terrain.length !== this.tiles.length`), and fires
`onTerrainChanged`/`onRelayout` so lighting, ambience, plinth and camera framing follow. Plinth
textures keyed by size (`plinth-iso-8`, `plinth-top-8`...). `BattleView.framed` uses `boardBounds()`
(make that size-aware) so the 8×8 fills the view. `fields.ts`: Chi on classic falls back to a
random battlefield (`randomBattlefield(seed)`) because presets are 12×12; say so in the carousel
hint if you can without touching SetupScene (the "Board" choice hint is yours).

Done when: setup → Board → Classic 8×8 shows a crisp 8×8 diorama (iso and top) with the plinth
fitting it, a match plays on it, switching back to Extended restores 12×12, the unit tests pass,
and the chemx gate passes.
