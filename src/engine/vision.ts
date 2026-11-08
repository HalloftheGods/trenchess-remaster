import type { GameState, PlayerId, Pos } from "./types";
import { BOARD_SIZE, inBounds } from "./rules";
import { forEachUnit, pseudoMovesFor } from "./moves";
import { emptyGrid } from "./game";

const SIGHT = 2;

const reveal = (grid: boolean[][], [r, c]: Pos, radius: number): void => {
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (inBounds(r + dr, c + dc)) grid[r + dr][c + dc] = true;
    }
  }
};

export const visibleCells = (s: GameState, viewer: PlayerId): boolean[][] => {
  const grid = emptyGrid(false);
  forEachUnit(s.board, (u, pos) => {
    if (u.owner !== viewer) return;
    reveal(grid, pos, SIGHT);
    for (const o of pseudoMovesFor(s.board, s.terrain, pos)) grid[o.to[0]][o.to[1]] = true;
  });
  return grid;
};

const nearOwn = (s: GameState, viewer: PlayerId, [r, c]: Pos): boolean => {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const cell = inBounds(r + dr, c + dc) ? s.board[r + dr][c + dc] : null;
      if (cell?.owner === viewer) return true;
    }
  }
  return false;
};

export const canSee = (s: GameState, viewer: PlayerId, grid: boolean[][], pos: Pos): boolean => {
  const u = s.board[pos[0]][pos[1]];
  if (!u || u.owner === viewer) return true;
  if (!grid[pos[0]][pos[1]]) return false;
  return s.terrain[pos[0]][pos[1]] !== "forest" || nearOwn(s, viewer, pos);
};

export const fullVision = (): boolean[][] => emptyGrid(true).slice(0, BOARD_SIZE);
