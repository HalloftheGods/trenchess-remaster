# Trenchess Remastered

A ground-up remaster of Trenchess: chess rebuilt as a turn-based war game on an
isometric diorama battlefield. Shape the terrain, deploy your army, then issue
orders each turn until one Warlord falls.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # rules engine tests
npm run build    # static build in dist/
npm run simulate # headless AI-vs-AI games, stats by board size
```

### Balance simulator

`npm run simulate` plays AI-vs-AI games with the real engine and prints how
games end (checkmate, king captured, desert, stalemate, bare kings, turn-cap
timeout), how many full moves a win takes, and when the first capture lands,
per board size and orders-per-turn. Board size is patched in at load time, so
the engine is untouched. Examples:

```bash
npm run simulate -- --sizes 8,10,12,14,16 --games 24 --ai recruit
npm run simulate -- --ai veteran --orders 1 --games 10 --json results.json
npm run simulate -- --ai recruit:veteran --battlefield open
```

See the header of `scripts/simulate.ts` for every option. Needs Node 22+.

## How it plays

- **Deployment:** place up to 16 terrain tiles in your half and arrange your
  army inside your back four rows (or let the battlefield randomize).
- **Orders:** Command mode gives 2 orders per turn, each to a different unit
  (the opening turn gets 1). Classic mode is 1 order per turn.
- **Terrain:** forests block rooks and knights; swamps block bishops and
  knights; mountains block rooks and bishops. Deserts admit everyone but stop
  sliders, and units left idle in a desert at the end of your turn perish.
  Pawns cross any terrain.
- **Upgraded moves:** kings joust (leap 2 straight, slaying what they jump),
  queens add a knight leap, rooks add a diagonal step, bishops add a 2-square
  straight jump, knights add a 3-square straight jump, pawns backflip 2 back.
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
