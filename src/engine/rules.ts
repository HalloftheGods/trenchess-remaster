import type { PlayerId, Terrain, UnitType } from "./types";

export type BoardKind = "classic" | "extended";

/** Classic is the 8x8 chessboard; Extended is the 12x12 Trenchess battlefield. */
export const BOARDS: Record<BoardKind, { size: number; terrainQuota: number }> = {
  classic: { size: 8, terrainQuota: 8 },
  extended: { size: 12, terrainQuota: 16 },
};

/** Live bindings: read them at call time, never cache them at module load. */
export let BOARD_SIZE = BOARDS.extended.size;

export let TERRAIN_QUOTA = BOARDS.extended.terrainQuota;

/** Switch the board for the next match. Even sizes of 8 or more; the quota defaults to 12x12 density. */
export const setBoardSize = (size: number, quota = Math.round((16 * size * size) / 144)): void => {
  if (size < 8 || size % 2 !== 0) throw new Error(`board size ${size} must be even and at least 8`);
  BOARD_SIZE = size;
  TERRAIN_QUOTA = quota;
};

export const setBoard = (kind: BoardKind): void => setBoardSize(BOARDS[kind].size, BOARDS[kind].terrainQuota);

export const boardKindOf = (size: number): BoardKind => (size === BOARDS.classic.size ? "classic" : "extended");

export const UNIT_VALUE: Record<UnitType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 100,
};

const BLOCKED: Record<Terrain, UnitType[]> = {
  flat: [],
  desert: [],
  forest: ["rook", "knight"],
  swamp: ["bishop", "knight"],
  mountain: ["rook", "bishop"],
};

export const canEnter = (type: UnitType, terrain: Terrain): boolean =>
  type === "pawn" || !BLOCKED[terrain].includes(type);

export const blockedUnits = (terrain: Terrain): UnitType[] => BLOCKED[terrain];

export const forwardOf = (player: PlayerId): number => (player === 0 ? -1 : 1);

export const promotionRow = (player: PlayerId): number => (player === 0 ? 0 : BOARD_SIZE - 1);

export const homeRows = (player: PlayerId): [number, number] =>
  player === 0 ? [BOARD_SIZE / 2, BOARD_SIZE - 1] : [0, BOARD_SIZE / 2 - 1];

export const deployRows = (player: PlayerId): [number, number] =>
  player === 0 ? [BOARD_SIZE - 4, BOARD_SIZE - 1] : [0, 3];

export const inRows = (row: number, [lo, hi]: [number, number]): boolean =>
  row >= lo && row <= hi;

export const inBounds = (r: number, c: number, size = BOARD_SIZE): boolean =>
  r >= 0 && r < size && c >= 0 && c < size;

export const opponent = (player: PlayerId): PlayerId => (player === 0 ? 1 : 0);

export const ARMY: UnitType[] = [
  "rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook",
];
