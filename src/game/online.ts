// Pure helpers for an online match, kept out of Match so it stays inside its line budget.
import type { Cell, Order, PlayerId, Terrain } from "../engine/types";
import { BOARD_SIZE, homeRows } from "../engine/rules";

const samePos = (a: readonly number[], b: readonly number[]): boolean => a[0] === b[0] && a[1] === b[1];

/** A deployment sent by the other tab is only taken if it is the size of this board. */
export const fitsBoard = (board: Cell[][], terrain: Terrain[][]): boolean => board.length === BOARD_SIZE && terrain.length === BOARD_SIZE;

/** Copies `player`'s home rows of board and terrain from `theirs` into ours. */
export function takeHalf(board: Cell[][], terrain: Terrain[][], theirs: { board: Cell[][]; terrain: Terrain[][] }, player: PlayerId): void {
  const [lo, hi] = homeRows(player);
  for (let r = lo; r <= hi; r++) {
    board[r] = theirs.board[r].slice();
    terrain[r] = theirs.terrain[r].slice();
  }
}

/** The legal order that matches what the other tab sent (same unit, from, to), or null. */
export const matchingOrder = (legal: Order[], sent: Order): Order | null =>
  legal.find((o) => o.unitId === sent.unitId && samePos(o.from, sent.from) && samePos(o.to, sent.to)) ?? null;
