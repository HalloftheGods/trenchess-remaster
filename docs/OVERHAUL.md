# Presentation overhaul: in-engine menus, splash, Chi presets, new chessmen, graphics

This is the shared spec for the overhaul. Every piece of work below is built against the
APIs written here so the parts fit together when merged. Read the whole file before coding.

## Goals (Xopher's words, 2026-11-08)

1. Show the **Hall of the Gods, Inc.** studio splash like the other games (undead-of-night), then
   the **title** with an animated title sequence and a vertical menu like undead-of-night.
2. **Menus must feel in-game**, not old-school HTML elements. The title, main menu and match setup
   are rendered **inside Phaser** with painted panels, animated markers, sounds and transitions.
3. In **setup**, the player interacts with the board **in real time**: every option changes the live
   board behind the panel (mode, Chi preset, piece style, colors, fog, opponent).
4. A **Chi experience**: a slider / carousel of named battlefield presets, the live board morphing
   between them.
5. **Five more chessmen art styles** (nine in total).
6. **Board view controls**: a compass widget to rotate, zoom, reset, and switch between the
   **isometric diorama** and a **classic straight-on top-down** view.
7. Squeeze the best graphics out of the engine: sky, lighting, ambient particles, post FX.

## Studio conventions (copied from undead-of-night)

- Splash: black screen, the gold Omega mark (`src/assets/brand/hall-of-the-gods.webp`, 739×741,
  transparent), "PRESENTED BY" in small gold caps, then "Hall of the Gods, Inc." in larger gold with
  glow, scanlines + vignette over it. Timings: fade in 400 ms, hold 1600 ms, fade out 500 ms.
  Any key or pointer skips it. `?nosplash` in the URL skips it entirely.
  `prefers-reduced-motion`: no fades, hold 1000 ms.
- Title footer: `© 2006–<build year> Hall of the Gods, Inc.` with the small Omega beside it, and the
  app version bottom-left (`__APP_VERSION__` from package.json via Vite `define`, add it to
  vite.config.ts if missing: `define: { __APP_VERSION__: JSON.stringify(pkg.version), __BUILD_YEAR__: new Date().getFullYear() }`).
- Title menu: a vertical list, one item per line, a marker on the selected item, arrow keys/WASD
  move, Enter opens, mouse-move selects, hover sound on move and click sound on open.

## Stack facts

- Vite 7, TypeScript strict (`noUnusedLocals`, `noUnusedParameters`), Phaser 3.90, vitest 4.
- `npx chemx audit` gate must pass: **no nested ternaries**, DOM listeners scoped with an
  `AbortController` signal, small files (split at ~250 lines), an interface per object shape.
- All art is painted procedurally onto canvases at boot (`paint()` in `src/render/art/canvas.ts`)
  and registered with `scene.textures.addCanvas`. No binary assets except the two brand images.
- Fonts: Cinzel (display) and Inter (body) are loaded from Google Fonts in `index.html`.
  Phaser text uses `fontFamily: "Cinzel, Georgia, serif"`; wait for `document.fonts.ready` before
  creating title text (helper in `src/render/ui/fonts.ts`).
- Sounds: `sfx` in `src/audio/sfx.ts` (`sfx.select()`, `sfx.hover?()` — add `hover()` if missing,
  a tiny click; keep it synthesized).
- Verification commands: `npx tsc --noEmit`, `npx vitest run`, `npx chemx audit`, `npx vite build`.
  Screenshots: Playwright is preinstalled (`require('playwright')`, chromium, launch with args
  `--use-gl=swiftshader --enable-webgl --ignore-gpu-blocklist`), dev server `npx vite --port 5173`.
  Test hooks live on `window.__tc`.

## File ownership (so parallel work never collides)

| Area | Files | Owner |
|---|---|---|
| UI kit + splash + title | `src/render/ui/uiArt.ts`, `src/render/ui/widgets.ts`, `src/render/ui/fonts.ts`, `src/render/scenes/SplashScene.ts`, `src/render/scenes/TitleScene.ts`, `vite.config.ts` (define) | uikit |
| Chi presets + live preview | `src/engine/presets.ts`, `src/engine/presets.test.ts`, `src/game/Match.ts` | presets |
| Graphics + view/projection | `src/render/iso.ts`, `src/render/art/terrainArt.ts`, `src/render/art/decorArt.ts`, `src/render/art/fxArt.ts`, `src/render/art/skyArt.ts` (new), `src/render/board/*`, `src/render/scenes/BattleScene.ts` | polish |
| New chessmen A | `src/render/art/styles/undeadArt.ts`, `clockworkArt.ts`, `origamiArt.ts` | styles-a |
| New chessmen B | `src/render/art/styles/pixelArt.ts`, `beastsArt.ts` | styles-b |
| Setup scene + compass (phase 2) | `src/render/scenes/SetupScene.ts`, `src/render/ui/Compass.ts`, `src/render/scenes/OverlayScene.ts` | setup |
| DOM reskin (phase 2) | `src/style.css`, `index.html`, `src/ui/Hud.ts`, `src/ui/Chessmen.ts`, `src/ui/movePreview.ts` | reskin |
| Flow integration | `src/main.ts`, `README.md` | integrator |

Do not edit files you do not own. If you need something from another area, build against the API
below; if the API is missing something, add a one-line note at the end of your report.

## Scene flow

```
SplashScene ("splash")  --ui:splash-done-->  TitleScene ("title", runs above "battle")
TitleScene  --ui:open {page}-->  main.ts decides:
   "play"    -> SetupScene ("setup", mode default pi)
   "lay"     -> SetupScene with mode omega
   "hello"   -> DOM panel #hello (reskinned)
   "educate" -> DOM panel #educate (Chessmen showcase, reskinned)
   "lead" | "study" -> disabled ("coming soon")
SetupScene  --ui:start {options}-->  main.ts starts the match (battle HUD is DOM, reskinned)
SetupScene  --ui:back-->  TitleScene
Battle over -> DOM #over (reskinned) -> "again" | "to-menu" (TitleScene)
```

Scenes communicate only through `scene.game.events` (a `Phaser.Events.EventEmitter`):

| Event | Payload | Emitted by |
|---|---|---|
| `ui:splash-done` | – | SplashScene |
| `ui:open` | `page: "hello" \| "play" \| "lay" \| "educate"` | TitleScene |
| `ui:preview` | `kind: "terrain" \| "open" \| "land"` (what to show on the board while hovering a menu item) | TitleScene |
| `ui:start` | `options: MatchOptions` | SetupScene |
| `ui:back` | – | SetupScene |
| `ui:setup-changed` | `options: MatchOptions` (every change, for the live board) | SetupScene |
| `ui:theme` | `{ style: PieceStyle; palette: PaletteId }` | SetupScene |
| `ui:view` | `{ action: "rotate", delta: 1 \| -1 } \| { action: "projection", value: "iso" \| "top" } \| { action: "zoom", factor: number } \| { action: "reset" }` | Compass |

The BattleScene stays running underneath everything (it is the world). UI scenes are
transparent and launched with `scene.launch` / stopped with `scene.stop`, never `start` (which
would stop the battle scene).

## UI kit API (`src/render/ui/`)

`uiArt.ts` – `paintUi(scene)` paints every UI texture once (idempotent via `paint()`):

| Key | What |
|---|---|
| `ui-panel` | 64×64 nine-slice: dark lacquered steel plate, gold rim, riveted corners. Corner size 18. |
| `ui-panel-parchment` | 64×64 nine-slice: aged parchment with burnt edge. Corner 18. |
| `ui-btn`, `ui-btn-hover`, `ui-btn-down`, `ui-btn-primary`, `ui-btn-primary-hover`, `ui-btn-disabled` | 48×48 nine-slice buttons, corner 14. Primary = gold/brass. |
| `ui-seg`, `ui-seg-on` | 40×40 nine-slice segment of a segmented control, corner 10. |
| `ui-marker` | 28×28 gold arrow head pointing right (menu marker). |
| `ui-dot`, `ui-dot-on` | 14×14 carousel dots. |
| `ui-check`, `ui-check-on` | 28×28 toggle box. |
| `ui-knob`, `ui-track` | slider knob 28×28, track 8×8 nine-slice. |
| `ui-scanlines` | 4×4 repeating scanline tile (use as TileSprite). |
| `ui-vignette` | 256×256 radial vignette. |
| `ui-spark` | 16×16 soft star particle. |
| `ui-ring` | 160×160 compass ring with N/E/S/W ticks (no letters; letters are text). |
| `ui-chevron` | 28×28 chevron pointing right (flip for left). |

`fonts.ts` – `export const FONT = { display: "Cinzel, Georgia, serif", body: "Inter, system-ui, sans-serif" }`,
`export const fontsReady = (): Promise<void>` (resolves on `document.fonts.ready` or after 800 ms).
`export const TEXT: Record<"h1"|"h2"|"h3"|"body"|"small"|"caps"|"button", Phaser.Types.GameObjects.Text.TextStyle>`.
`export const COLOR = { gold: 0xf2c94c, goldHex: "#f2c94c", bone: "#e9e2cf", dim: "#9aa3b5", ink: 0x0b0f1a, p0: "#5aa2ff", p1: "#ff5a5a" }`.

`widgets.ts` – all widgets extend `Phaser.GameObjects.Container`, are added to the scene in
their constructor, and position by their **top-left** unless noted:

```ts
export class Panel extends Container { constructor(scene, x, y, w, h, variant: "steel" | "parchment" = "steel"); resize(w, h): void }
export interface ButtonOptions { w?: number; h?: number; primary?: boolean; icon?: string /* texture key */; small?: boolean }
export class Button extends Container { constructor(scene, x, y, label: string, onPress: () => void, opts?: ButtonOptions); setEnabled(on): this; setLabel(s): this; readonly width; readonly height }
export interface Choice { id: string; label: string; hint?: string; disabled?: boolean }
export class Segmented extends Container { constructor(scene, x, y, w, choices: Choice[], value: string, onChange: (id: string) => void); setValue(id): this; setChoices(choices): this }
export class Toggle extends Container { constructor(scene, x, y, label: string, value: boolean, onChange: (v: boolean) => void); setValue(v): this }
export class Carousel extends Container { constructor(scene, x, y, w, items: Choice[], index: number, onChange: (index: number) => void); setIndex(i, animate?: boolean): this; setItems(items): this }
  // chevrons left/right, dots, item label + hint, drag/swipe on the label area, wheel, left/right keys when focused
export interface MenuItem extends Choice { preview?: string }
export class MenuList extends Container { constructor(scene, x, y, items: MenuItem[], onOpen: (id: string) => void, onSelect?: (id: string) => void); select(i): void; readonly selected: number }
  // vertical list, animated marker, keyboard (ArrowUp/Down, W/S, Enter), mouse move selects, click opens, disabled items dim with "coming soon"
export const heading = (scene, x, y, text, kind: "h1"|"h2"|"h3"|"caps" = "h2"): Phaser.GameObjects.Text
export const slideIn = (scene, targets: Phaser.GameObjects.GameObject[], from: "left"|"right"|"up"|"down", delay = 0, distance = 40): void
export const fadeOut = (scene, targets, duration = 250): Promise<void>
```

Every widget plays `sfx.hover()` on hover-in and `sfx.select()` on press. Every widget cleans its
own input listeners on destroy (Phaser does this for game-object listeners; for `scene.input.keyboard`
listeners, remove them in `destroy()`).

## Setup scene (phase 2)

A right-side steel panel (≈ 420 px wide, full height minus margins) over the live board. Rows:

1. **Mode** segmented: Ω Omega · χ Chi · π Pi · α Alpha, with the classic taglines as hint text.
2. **Battlefield** (only when Chi): `Carousel` of `PRESETS` (name + tagline). Changing it emits
   `ui:setup-changed` so the board morphs to that preset.
3. **Opponent** segmented: Computer · Hotseat. **Commander** segmented (Recruit/Veteran/Warlord),
   dimmed when Hotseat.
4. **Orders** segmented: Command (2) · Classic (1).
5. **Chessmen** carousel of `STYLE_ORDER` with `STYLE_LABELS`; **Colors** segmented from `PALETTES`
   (`Blue & Red`, `White & Black`, `Green & Yellow`). Changing emits `ui:theme` (the board repaints).
6. **Fog of war** toggle (board shows fog preview while on).
7. Buttons: `To battle` (primary) and `Back`. Esc = back. Enter = To battle.

The left side of the screen is the board. The `Compass` widget sits bottom-left (see below). On
entry the panel slides in from the right and the camera eases to frame the board left of center
(BattleScene `view.frame("setup")`). On start the panel slides out.

## Compass (`src/render/ui/Compass.ts`)

A 160 px ring (`ui-ring`) with N/E/S/W letters that counter-rotate with `getRotation()` so N always
points to row 0's direction; two rotate buttons (⟲ ⟳), + / − zoom, a "⌂" reset button and an
"Iso / Top" segmented toggle. Dragging the ring rotates in 90° snaps (one snap per 60° of drag).
Emits `ui:view`. Keyboard: Q/E rotate, V toggles projection, Home resets, +/- zoom, arrows pan
(these keys are bound by `main.ts`, the widget only shows them in tooltips).
`OverlayScene` ("overlay") hosts the compass during setup and battle; `scene.launch("overlay", { show: true })`,
and `overlay.setVisible(false)` hides it during the splash/title.

## View API (polish owner, on `BattleScene`)

```ts
export type Projection = "iso" | "top";
scene.view: {
  rotate(delta: 1 | -1): Promise<void>;        // 420 ms relayout; resolves when done
  setProjection(p: Projection): Promise<void>;  // iso <-> top-down, 500 ms morph
  readonly projection: Projection;
  zoomBy(factor: number): void;
  panBy(dx: number, dy: number): void;
  reset(): void;                                // re-fit and center
  frame(where: "center" | "setup"): void;       // "setup" frames the board in the left 60% of the screen
  setDrift(on: boolean): void;                  // slow camera orbit on the title
}
```

`src/render/iso.ts` gains `getProjection()/setProjection()`; in `"top"` projection `toScreen` maps
cells to a square grid (`TOP_TILE = 64`, board centered on 0,0), `ELEVATION` lifts are 0, `toCell`
inverts it, rotation still applies. `terrainArt.ts` paints square top-down tile textures
(`tileTopKey(t, light, v)`, 64×64: forest canopy blobs, swamp water with ripples, mountain shaded
peaks from above, desert dunes; strong light/dark checkerboard). `BoardView.relayout` swaps
textures/origins per projection; decor sprites hide in top view (the tile carries the detail).
Units keep their standing sprites in both views.

## Chi presets (`src/engine/presets.ts`)

```ts
export interface Preset { id: string; name: string; tagline: string; terrain: Terrain[][] }
export const PRESETS: Preset[];           // 12 named battlefields, each point-symmetric (mirrorPos)
export const presetById = (id: string): Preset;  // falls back to PRESETS[0]
```

Rules for a preset: 12×12, point-symmetric through the center, formation squares (rows 2,3,8,9 ×
cols 2–9) stay `flat`, every terrain type used across the set, ≤ 40 non-flat cells per side so the
board stays playable, no row fully blocked for every piece (a pawn can always advance somewhere).
Names come from the lore: e.g. Whispering Woods, Sunken Realm, Iron Peaks, Endless Sands,
Four Corners, The Crucible, Serpent River, Twin Lakes, Crossroads, Scorched Earth, Archipelago,
The Trench. `Match.preview(options)` sets board+terrain for any options without starting
(omega: armies on plains; chi: `presetById(options.preset)` with classic armies; pi: random field;
alpha: random field + random formation), and `Match.start` uses `options.preset` in chi.

## New chessmen styles (`src/render/art/styles/*Art.ts`)

Each file exports `Record<UnitType, (g: CanvasRenderingContext2D, f: Faction) => void>` painting
into a 64×100 canvas: center `X = 32`, the foot/base ellipse at `y ≈ 86–92`, the top of the piece no
higher than `y ≈ 6`. Use `f.base / f.light / f.dark / f.trim` so both armies read as the chosen
colors (the palette can be Blue/Red, White/Black, Green/Yellow). Each piece must be recognisable at
~48 px tall on the board: silhouette first. Look at `legionArt.ts` for the drawing helpers pattern
(`ellipse`, `shade`, gradients, `poly`). Styles:

- **undead** "Bone Legion": skeleton pawn with rusted blade, skeletal horse + rider knight, hooded
  lich bishop with green soul-flame, bone-and-iron siege tower rook, banshee queen with veil,
  crowned lich king on a throne of skulls. Army color on cloaks/banners/eye glow.
- **clockwork** "Clockwork": brass automata: wind-up key pawn, gear-legged mechanical steed, lens-eyed
  tesla bishop, boiler-chimney rook with pistons, orrery queen with spinning rings, gilded engine
  king with a pressure-gauge crown. Army color on enamel panels; brass and copper metal gradients.
- **origami** "Origami": folded paper with crisp planar facets, visible creases (lighter on lit
  faces, darker on shadow faces), paper-white edges, army color as the paper color.
- **pixel** "8-bit": draw at 16×25 (or 16×24) logical pixels with a tiny palette and scale ×4 with
  `imageSmoothingEnabled = false`; chunky outlines, 1-px highlights; retro console look.
- **beasts** "Beasts": the animal kingdom: hare pawn, stag knight, owl bishop, bear rook, lioness
  queen, lion king with mane; army color on collars/saddles/banners, natural fur colors.

## Graphics polish (polish owner)

- `skyArt.ts`: a sky dome painted once (gradient dusk sky, soft sun glow, a few distant peaks) as a
  large image behind the plinth, plus a slowly rotating star field (TileSprite) at low alpha.
- Lighting: a warm light from the upper-left: tiles get a subtle gradient (already lit/dark),
  add soft ambient-occlusion darkening along the board's outer edge and under mountains.
- Ambient particles via `scene.add.particles`: fireflies over forests, bubbles over swamps, sand
  wisps over deserts, snow-mist over mountains; density low (≤ 60 particles total), paused when
  the tab is hidden.
- Post FX (WebGL only, guard with `if (cam.postFX)`): vignette (0.45), slight bloom on the FX
  layer, tilt-shift on the title/setup for the diorama look (off during battle for readability).
- Selection glow: `preFX.addGlow` on the selected unit sprite (WebGL only).
- Keep 60 fps on a laptop: no per-frame allocations in `update`.

## Reskin of the remaining DOM (phase 2)

The in-battle HUD, the Hello panel, the Chessmen showcase and the game-over card remain DOM, but
must look like the engine panels: dark lacquered steel plates with gold rims and riveted corners
(generated as CSS gradients + box-shadows, no images), Cinzel headings, gold hover glows, subtle
scanline overlay, panel slide/fade transitions. Remove the old `#title`, `#menu`, `.card` and
`#setup` form markup from `index.html` (the Phaser scenes replace them); keep `#hud`, `#banner`,
`#over`, and the two panels (`hello`, `educate`) with a `.panel-close` button. Keep the `data-act`
contract that `main.ts` relies on: `end-turn`, `rotate-left`, `rotate-right`, `style`, `sound`,
`menu`, `again`, `to-menu`, `randomize`, `clear`, `ready`, and add `[data-back]` on the panel
close buttons.
