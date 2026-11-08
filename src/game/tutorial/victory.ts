import type { Cell, Pos, Terrain, UnitType } from "../../engine/types";
import { emptyGrid } from "../../engine/game";
import type { Demo, DemoHooks, Tutorial } from "../tutorial";

interface Placed {
  at: Pos;
  type: UnitType;
  owner: 0 | 1;
}

/** The staged ending: a cornered king, a rook that pins the file and a queen that seals the escape. */
const POSITION: Placed[] = [
  { at: [1, 6], type: "king", owner: 1 },
  { at: [2, 5], type: "pawn", owner: 1 },
  { at: [2, 7], type: "pawn", owner: 1 },
  { at: [1, 8], type: "knight", owner: 1 },
  { at: [10, 4], type: "king", owner: 0 },
  { at: [9, 6], type: "rook", owner: 0 },
  { at: [7, 2], type: "queen", owner: 0 },
  { at: [8, 3], type: "pawn", owner: 0 },
];

interface Step {
  from: Pos;
  to: Pos;
  caption: string;
}

/** Three orders: the fortress takes the file, the queen closes the net, the fortress strikes. */
const STEPS: Step[] = [
  { from: [9, 6], to: [4, 6], caption: "1. The Twilight Fortress takes the open file." },
  { from: [7, 2], to: [4, 5], caption: "2. The Sacred Queen seals every escape." },
  { from: [4, 6], to: [1, 6], caption: "3. The Fortress strikes. The King falls." },
];

const BEAT = 1100;
const LOOP_GAP = 2600;

const position = (): Cell[][] => {
  const board = emptyGrid<Cell>(null);
  POSITION.forEach((p, i) => {
    board[p.at[0]][p.at[1]] = { id: 100 + i, type: p.type, owner: p.owner };
  });
  return board;
};

/**
 * Chapter 6, Victory: a staged three-move finish that ends in the capture of the enemy King with the
 * real capture effects, then resets and plays again. Reduced motion shows the board after the blow.
 */
export const victoryDemo = (t: Tutorial, hooks: DemoHooks): Demo => {
  const token = t.begin();
  const reset = (): void => t.show(position(), emptyGrid<Terrain>("flat"));
  const run = async (): Promise<void> => {
    reset();
    hooks.progress?.("The enemy King is cornered…");
    await t.wait(900);
    for (const step of STEPS) {
      if (!t.alive(token)) return;
      hooks.progress?.(step.caption);
      const unit = t.board[step.from[0]][step.from[1]];
      if (unit) t.units.highlight(unit.id);
      t.boardView.showMarkers([step.from], "select");
      t.boardView.showMarkers([step.to], t.board[step.to[0]][step.to[1]] ? "attack" : "move");
      await t.wait(BEAT * 0.6);
      if (!t.alive(token)) return;
      t.boardView.clearMarkers();
      t.units.highlight(null);
      await t.move(step.from, step.to);
      await t.wait(BEAT * 0.4);
    }
    if (t.alive(token)) t.units.celebrate(0);
  };
  const endState = (): void => {
    reset();
    for (const step of STEPS) {
      const u = t.board[step.from[0]][step.from[1]];
      t.board[step.to[0]][step.to[1]] = u ? { ...u, moved: true } : null;
      t.board[step.from[0]][step.from[1]] = null;
    }
    t.sync();
    hooks.progress?.(STEPS[STEPS.length - 1].caption);
  };
  const loop = async (): Promise<void> => {
    while (t.alive(token)) {
      await run();
      await t.wait(LOOP_GAP);
    }
  };
  if (t.still) endState();
  else void loop();
  return { stop: () => t.stop() };
};
