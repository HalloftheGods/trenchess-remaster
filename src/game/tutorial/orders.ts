import type { Pos, Terrain } from "../../engine/types";
import { emptyGrid } from "../../engine/game";
import { createArmies } from "../../engine/setup";
import { sfx } from "../../audio/sfx";
import type { Demo, DemoHooks, Tutorial } from "../tutorial";

interface Step {
  from: Pos;
  to: Pos;
}

/** Two orders on the opening formation: the Shadow Knight leaps, then a Nimbus Jumper marches two. */
const STEPS: Step[] = [
  { from: [9, 3], to: [7, 4] },
  { from: [8, 6], to: [6, 6] },
];

const LOOP_GAP = 2200;

/**
 * Chapter 3, Orders: Command mode. Two chessmen light up in turn and move; the page's counter reads
 * "Order 1 of 2" then "Order 2 of 2"; both are then shown spent. Loops unless motion is reduced.
 */
export const ordersDemo = (t: Tutorial, hooks: DemoHooks): Demo => {
  const token = t.begin();
  const reset = (): void => t.show(createArmies(), emptyGrid<Terrain>("flat"));
  const spent = (): number[] => STEPS.map((s) => t.board[s.to[0]][s.to[1]]?.id ?? -1).filter((id) => id >= 0);
  const run = async (): Promise<void> => {
    reset();
    for (let i = 0; i < STEPS.length; i++) {
      if (!t.alive(token)) return;
      const step = STEPS[i];
      const unit = t.board[step.from[0]][step.from[1]];
      if (!unit) return;
      hooks.progress?.(`Order ${i + 1} of ${STEPS.length}`);
      t.units.highlight(unit.id);
      t.units.pulse(unit.id);
      sfx.select();
      t.boardView.showMarkers([step.from], "select");
      t.boardView.showMarkers([step.to], "move");
      await t.wait(700);
      if (!t.alive(token)) return;
      t.boardView.clearMarkers();
      t.units.highlight(null);
      await t.move(step.from, step.to);
      if (!t.alive(token)) return;
      t.units.setSpent(spent());
    }
    hooks.progress?.("Turn passes");
  };
  const endState = (): void => {
    reset();
    for (const s of STEPS) {
      const u = t.board[s.from[0]][s.from[1]];
      t.board[s.to[0]][s.to[1]] = u ? { ...u, moved: true } : null;
      t.board[s.from[0]][s.from[1]] = null;
    }
    t.sync();
    t.units.setSpent(spent());
    hooks.progress?.(`Order ${STEPS.length} of ${STEPS.length}`);
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
