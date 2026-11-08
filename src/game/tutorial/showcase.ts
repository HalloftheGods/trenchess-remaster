import { randomBattlefield } from "../../engine/setup";
import type { Demo, Tutorial } from "../tutorial";

/** The cover and the controls page: a random battlefield with both armies, nothing more. */
export const showcaseDemo = (t: Tutorial, seed: number): Demo => {
  t.begin();
  const field = randomBattlefield(seed);
  t.show(field.board, field.terrain);
  return { stop: () => t.stop() };
};
