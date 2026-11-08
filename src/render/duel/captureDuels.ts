import type { Cell, Order, Terrain, UnitType } from "../../engine/types";
import { duels, type DuelMode } from "./duel";

/**
 * Plays one duel per piece the order captured, in path order, once the board has shown the move.
 * `before` is the board as it stood when the order was given, so both chessmen are known.
 */
/** Whether an order used the chessman's upgraded Trenchess move (its named ability) rather than its classic chess move. */
const USES_ABILITY: Record<UnitType, (o: Order) => boolean> = {
  king: (o) => o.style === "joust",
  queen: (o) => o.style === "jump",
  rook: (o) => o.style === "step",
  bishop: (o) => o.style === "jump",
  knight: (o) => o.to[0] === o.from[0] || o.to[1] === o.from[1],
  pawn: (o) => o.style === "flip",
};

export const usedAbility = (order: Order, type: UnitType): boolean => USES_ABILITY[type](order);

export const captureDuels = async (order: Order, before: Cell[][], terrain: Terrain[][], mode: DuelMode): Promise<void> => {
  const attacker = before[order.from[0]][order.from[1]];
  if (mode === "off" || !attacker) return;
  for (const [r, c] of order.captures) {
    const defender = before[r][c];
    if (defender) await duels.play({ attacker, defender, terrain: terrain[r][c], attackerOwner: attacker.owner, mode, special: usedAbility(order, attacker.type) });
  }
};
