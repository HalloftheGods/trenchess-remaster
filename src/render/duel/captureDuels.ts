import type { Cell, Order, Terrain } from "../../engine/types";
import { duels, type DuelMode } from "./duel";

/**
 * Plays one duel per piece the order captures, in path order, before the board shows the capture.
 * `before` is the board as it stood when the order was given, so both chessmen are still on it.
 */
export const captureDuels = async (order: Order, before: Cell[][], terrain: Terrain[][], mode: DuelMode): Promise<void> => {
  const attacker = before[order.from[0]][order.from[1]];
  if (mode === "off" || !attacker) return;
  for (const [r, c] of order.captures) {
    const defender = before[r][c];
    if (defender) await duels.play({ attacker, defender, terrain: terrain[r][c], attackerOwner: attacker.owner, mode });
  }
};
