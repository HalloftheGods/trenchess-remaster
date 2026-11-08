import type { Terrain, UnitType } from "../engine/types";

export interface UnitLore {
  title: string;
  role: string;
  moves: string;
}

export const UNIT_LORE: Record<UnitType, UnitLore> = {
  king: { title: "Warlord", role: "King", moves: "Steps 1 in any direction. Joust: leaps 2 straight, slaying an enemy it jumps over. Lose it and you lose the war." },
  queen: { title: "Champion", role: "Queen", moves: "Slides in any direction, plus a knight's leap." },
  rook: { title: "Siege Tower", role: "Rook", moves: "Slides straight, plus a 1-step diagonal. Cannot enter forests or mountains." },
  bishop: { title: "Mystic", role: "Bishop", moves: "Slides diagonally, plus a 2-square straight jump. Cannot enter swamps or mountains." },
  knight: { title: "Cavalry", role: "Knight", moves: "L-shaped leap, plus a 3-square straight jump. Cannot enter forests or swamps." },
  pawn: { title: "Trooper", role: "Pawn", moves: "Steps forward, captures diagonally forward. Backflip: jumps 2 back, or 2 back and 1 aside to capture. Crosses any terrain. Promotes on the far edge." },
};

export interface TerrainLore {
  name: string;
  text: string;
  color: string;
}

export const TERRAIN_LORE: Record<Terrain, TerrainLore> = {
  flat: { name: "Plains", text: "Open ground. Everyone may pass.", color: "#86b34e" },
  forest: { name: "Forest", text: "Rooks and Knights cannot enter. A unit here is hidden from the enemy's sight unless they stand adjacent.", color: "#3f7f3a" },
  swamp: { name: "Swamp", text: "Bishops and Knights cannot enter. A sanctuary for Rooks.", color: "#3f8a80" },
  mountain: { name: "Mountains", text: "Rooks and Bishops cannot enter. High ground for Knights.", color: "#9a8f7e" },
  desert: { name: "Desert", text: "Anyone may enter but sliders must stop. Units that end your turn here without acting perish.", color: "#e6c47c" },
};
