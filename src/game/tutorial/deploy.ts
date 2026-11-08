import type { Pos, Terrain } from "../../engine/types";
import { emptyGrid } from "../../engine/game";
import { BOARD_SIZE, TERRAIN_QUOTA, deployRows, homeRows, inRows } from "../../engine/rules";
import { canPlaceTerrain, createArmies, randomBattlefield, terrainCount } from "../../engine/setup";
import { sfx } from "../../audio/sfx";
import type { Demo, DemoHooks, Tutorial } from "../tutorial";

const DROP_MS = 190;

const cellsIn = (rows: [number, number]): Pos[] => {
  const out: Pos[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) if (inRows(r, rows)) out.push([r, c]);
  return out;
};

/** The terrain a random battlefield lays in a player's half, in drop-in order. */
const tilesFor = (seed: number, player: 0 | 1): { at: Pos; t: Terrain }[] => {
  const { terrain } = randomBattlefield(seed);
  return cellsIn(homeRows(player))
    .filter(([r, c]) => terrain[r][c] !== "flat")
    .map(([r, c]) => ({ at: [r, c] as Pos, t: terrain[r][c] }))
    .slice(0, TERRAIN_QUOTA);
};

/**
 * Chapter 2, Deploy: the back four rows glow, terrain tiles drop into both halves one by one, then
 * the player lays forests of their own on glowing cells of their half (real `canPlaceTerrain` rules).
 */
export const deployDemo = (t: Tutorial, hooks: DemoHooks, seed: number): Demo => {
  const token = t.begin();
  t.show(createArmies(), emptyGrid<Terrain>("flat"));
  t.boardView.showMarkers(cellsIn(deployRows(0)), "deploy");
  const report = (): void => {
    const laid = terrainCount(t.terrain, 0);
    hooks.progress?.(laid >= TERRAIN_QUOTA ? `All ${TERRAIN_QUOTA} tiles laid. The Trench is ready.` : `${laid} of ${TERRAIN_QUOTA} tiles laid. Click a glowing cell to plant a forest.`);
  };
  const arm = (): void => {
    if (!t.alive(token)) return;
    const open = cellsIn(homeRows(0)).filter(([r, c]) => t.terrain[r][c] === "flat" && canPlaceTerrain(t.board, 0, [r, c], "forest"));
    t.boardView.showPreview(open, "move", 0.3);
    report();
    t.setClickHandler(([r, c]) => {
      const ok = inRows(r, homeRows(0)) && t.terrain[r][c] === "flat" && canPlaceTerrain(t.board, 0, [r, c], "forest") && terrainCount(t.terrain, 0) < TERRAIN_QUOTA;
      if (!ok) {
        sfx.error();
        return;
      }
      t.paint(r, c, "forest");
      t.boardView.pop(r, c);
      sfx.terrain();
      arm();
    });
  };
  const drop = async (): Promise<void> => {
    const mine = tilesFor(seed, 0).slice(0, 10);
    const theirs = tilesFor(seed, 1);
    const all = mine.flatMap((m, i) => (theirs[i] ? [m, theirs[i]] : [m]));
    for (const { at, t: kind } of all) {
      if (!t.alive(token)) return;
      t.paint(at[0], at[1], kind);
      t.boardView.pop(at[0], at[1]);
      sfx.terrain();
      hooks.progress?.(`${terrainCount(t.terrain, 0)} of ${TERRAIN_QUOTA} tiles laid…`);
      if (!t.still) await t.wait(DROP_MS);
    }
    arm();
  };
  void drop();
  return { stop: () => t.stop() };
};
