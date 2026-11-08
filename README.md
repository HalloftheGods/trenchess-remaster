# Trenchess Remastered

A ground-up remaster of Trenchess: chess rebuilt as a turn-based war game on an
isometric diorama battlefield. Shape the terrain, deploy your army, then issue
orders each turn until one King falls.

## Run it

```bash
pnpm install     # or npm install
pnpm dev         # http://localhost:5173
npm test         # rules engine tests
npm run build    # static build in dist/
npm run simulate # headless AI-vs-AI games, stats by board size
```

### Balance simulator

`npm run simulate` plays AI-vs-AI games with the real engine and prints how
games end (checkmate, king captured, desert, stalemate, bare kings, turn-cap
timeout), how many full moves a win takes, and when the first capture lands,
per board size and orders-per-turn. Examples:

```bash
npm run simulate -- --sizes classic,extended --games 24 --ai recruit
npm run simulate -- --sizes 8,10,12,14,16
npm run simulate -- --ai veteran --orders 1 --games 10 --json results.json
npm run simulate -- --ai recruit:veteran --battlefield open
```

See the header of `scripts/simulate.ts` for every option. Needs Node 22+.

## How it plays

- **Board:** Extended is the 12x12 Trenchess battlefield; Classic is an 8x8
  chessboard with the armies on the edge rows and 8 terrain tiles a side.
- **Deployment:** place up to 16 terrain tiles in your half and arrange your
  army inside your back four rows (or let the battlefield randomize).
- **Orders:** Command mode gives 2 orders per turn, each to a different unit
  (the opening turn gets 1). Classic mode is 1 order per turn.
- **Terrain:** forests block rooks and knights; swamps block bishops and
  knights; mountains block rooks and bishops. Deserts admit everyone but stop
  sliders, and units left idle in a desert at the end of your turn perish.
  Pawns cross any terrain.
- **The Chessmen grow stronger:** Equinox King (Somersault Assault: 2 straight,
  capturing what it passes, never through a guarded square), Sacred Queen
  (8 Legged Gallop: knight leaps), Twilight Fortress (Four-Corners Fortnight:
  1 diagonal), Light Seer (Leap of Faith: 2 straight), Shadow Knight
  (Triple-Bar Jump: 3 straight), Nimbus Jumper (Double-back Flip: 2 back).
- **Modes:** Ω Omega (build everything), χ Chi (terrain generated, you arrange
  pieces), π Pi (classic formation, random terrain), α Alpha (all random).
- **View:** Q/E rotate the board, T cycles piece styles (Figurines, Chessmen,
  Crystal, Bold glyphs), plus three color sets.
- **Victory:** capture or checkmate the enemy king.
- **Fog of war (optional):** you only see tiles near your units, and units in
  forests are hidden unless you stand adjacent.

## Code map

| Path | What lives there |
| --- | --- |
| `src/engine/` | Pure TypeScript rules: move generation, turns, setup, AI (alpha-beta in a Web Worker), vision. No rendering code. |
| `src/render/art/` | All graphics, painted procedurally on canvas at boot (terrain, decor, units, effects). No image assets. |
| `src/render/board/` | Phaser views: board tiles and markers, unit tokens and their animations, particle effects. |
| `src/render/scenes/` | The Phaser scene: camera, input, ambience. |
| `src/game/` | Match controller: deployment, battle flow, AI turns. |
| `src/ui/` | DOM HUD: faction plates, inspector, battle log, deployment tools, banners. |
| `src/audio/` | Synthesized sound effects (Web Audio, no files). |

Architecture checks use [Chemical X](https://www.npmjs.com/package/chemx):
`npx chemx audit`.
