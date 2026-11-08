import type { PlayerId, Terrain, UnitType } from "./types";

export const BOARD_SIZE = 12;

export const TERRAIN_QUOTA = 16;

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

export const inBounds = (r: number, c: number): boolean =>
  r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

export const opponent = (player: PlayerId): PlayerId => (player === 0 ? 1 : 0);

export const ARMY: UnitType[] = [
  "rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook",
];
