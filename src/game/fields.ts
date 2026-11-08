import type { Cell, Terrain } from "../engine/types";
import { emptyGrid } from "../engine/game";
import { createArmies, randomBattlefield, randomFormation, seededRng } from "../engine/setup";
import { PRESETS, presetById } from "../engine/presets";
import { BOARD_SIZE } from "../engine/rules";

export type GameMode = "omega" | "chi" | "pi" | "alpha" | "tau";

export interface Field {
  board: Cell[][];
  terrain: Terrain[][];
}

export interface FieldOptions {
  mode: GameMode;
  /** Chi only: a `Preset.id`; a random preset is drawn when missing. */
  preset?: string;
}

export const freshSeed = (): number => Math.floor(Math.random() * 1e9);

const copyTerrain = (terrain: Terrain[][]): Terrain[][] => terrain.map((row) => row.slice());

/** Omega: the classic armies on open plains, terrain still to be laid. */
export const plainsField = (): Field => ({ board: createArmies(), terrain: emptyGrid<Terrain>("flat") });

/** Chi: a named battlefield (or a seeded random pick) with the classic armies. */
export const presetField = (preset: string | undefined, seed: number): Field => {
  const chosen = preset === undefined ? PRESETS[Math.floor(seededRng(seed)() * PRESETS.length)] : presetById(preset);
  return { board: createArmies(), terrain: copyTerrain(chosen.terrain) };
};

/** Alpha: a random field with both armies scattered through their deployment rows. */
export const scatteredField = (seed: number): Field => {
  const field = randomBattlefield(seed);
  const rng = seededRng(seed + 1);
  randomFormation(field.board, field.terrain, 0, rng);
  randomFormation(field.board, field.terrain, 1, rng);
  return field;
};

/** The board and terrain a match (or its live preview) begins with, for the chosen mode. Chi presets are 12×12, so a Classic board gets a random battlefield. */
export const buildField = (options: FieldOptions, seed: number): Field => {
  if (options.mode === "omega" || options.mode === "tau") return plainsField();
  if (options.mode === "chi" && BOARD_SIZE === 12) return presetField(options.preset, seed);
  if (options.mode === "alpha") return scatteredField(seed);
  return randomBattlefield(seed);
};
