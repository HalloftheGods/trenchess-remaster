import type { Cell, PlayerId, Pos, Terrain, UnitType } from "./types";
import { ARMY, BOARD_SIZE, TERRAIN_QUOTA, canEnter, deployRows, homeRows, inRows } from "./rules";
import { emptyGrid } from "./game";

export type Rng = () => number;

export const seededRng = (seed: number): Rng => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

export const classicFormation = (player: PlayerId): { pos: Pos; type: UnitType }[] => {
  const back = player === 0 ? 9 : 2;
  const front = player === 0 ? 8 : 3;
  return ARMY.flatMap((type, i) => [
    { pos: [back, i + 2] as Pos, type },
    { pos: [front, i + 2] as Pos, type: "pawn" as UnitType },
  ]);
};

export const createArmies = (): Cell[][] => {
  const board = emptyGrid<Cell>(null);
  let id = 1;
  for (const player of [0, 1] as PlayerId[]) {
    for (const { pos, type } of classicFormation(player)) board[pos[0]][pos[1]] = { id: id++, type, owner: player };
  }
  return board;
};

const FEATURES: Terrain[] = ["forest", "swamp", "mountain", "desert"];

export const mirrorPos = ([r, c]: Pos): Pos => [BOARD_SIZE - 1 - r, BOARD_SIZE - 1 - c];

export const canPlaceTerrain = (board: Cell[][], player: PlayerId, [r, c]: Pos, t: Terrain): boolean => {
  if (!inRows(r, homeRows(player))) return false;
  const unit = board[r][c];
  if (!unit) return true;
  return t !== "desert" && canEnter(unit.type, t);
};

export const terrainCount = (terrain: Terrain[][], player: PlayerId): number => {
  const [lo, hi] = homeRows(player);
  let n = 0;
  for (let r = lo; r <= hi; r++) n += terrain[r].filter((t) => t !== "flat").length;
  return n;
};

const clusterCells = (rng: Rng, player: PlayerId): Pos[] => {
  const [lo, hi] = homeRows(player);
  const r = lo + Math.floor(rng() * (hi - lo + 1));
  const c = Math.floor(rng() * BOARD_SIZE);
  const cells: Pos[] = [[r, c]];
  const size = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < size; i++) {
    const [br, bc] = cells[Math.floor(rng() * cells.length)];
    const dr = Math.floor(rng() * 3) - 1;
    const dc = Math.floor(rng() * 3) - 1;
    cells.push([br + dr, bc + dc]);
  }
  return cells;
};

export const randomTerrainFor = (board: Cell[][], terrain: Terrain[][], player: PlayerId, rng: Rng): void => {
  const [lo, hi] = homeRows(player);
  for (let r = lo; r <= hi; r++) terrain[r].fill("flat");
  let guard = 0;
  while (terrainCount(terrain, player) < TERRAIN_QUOTA && guard++ < 400) {
    const kind = FEATURES[Math.floor(rng() * FEATURES.length)];
    for (const [r, c] of clusterCells(rng, player)) {
      const valid = r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
      if (!valid || terrain[r][c] !== "flat" || terrainCount(terrain, player) >= TERRAIN_QUOTA) continue;
      if (canPlaceTerrain(board, player, [r, c], kind)) terrain[r][c] = kind;
    }
  }
};

export const mirrorTerrain = (terrain: Terrain[][], from: PlayerId): void => {
  const [lo, hi] = homeRows(from);
  for (let r = lo; r <= hi; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const [mr, mc] = mirrorPos([r, c]);
      terrain[mr][mc] = terrain[r][c];
    }
  }
};

export const randomBattlefield = (seed: number): { board: Cell[][]; terrain: Terrain[][] } => {
  const rng = seededRng(seed);
  const board = createArmies();
  const terrain = emptyGrid<Terrain>("flat");
  randomTerrainFor(board, terrain, 0, rng);
  mirrorTerrain(terrain, 0);
  return { board, terrain };
};

export const canDeployTo = (board: Cell[][], terrain: Terrain[][], player: PlayerId, from: Pos, to: Pos): boolean => {
  const unit = board[from[0]][from[1]];
  if (!unit || unit.owner !== player || !inRows(to[0], deployRows(player))) return false;
  const t = terrain[to[0]][to[1]];
  if (t === "desert" || !canEnter(unit.type, t)) return false;
  const other = board[to[0]][to[1]];
  if (!other) return true;
  const back = terrain[from[0]][from[1]];
  return other.owner === player && back !== "desert" && canEnter(other.type, back);
};

export const swapUnits = (board: Cell[][], from: Pos, to: Pos): void => {
  const a = board[from[0]][from[1]];
  board[from[0]][from[1]] = board[to[0]][to[1]];
  board[to[0]][to[1]] = a;
};
