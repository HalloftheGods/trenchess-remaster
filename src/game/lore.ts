import type { Terrain, UnitType } from "../engine/types";

export interface UnitLore {
  title: string;
  role: string;
  chess: string;
  motto: string;
  ability: string;
  classicMove: string;
  color: string;
  moves: string;
}

export const UNIT_LORE: Record<UnitType, UnitLore> = {
  king: {
    title: "Equinox King",
    role: "Leader",
    chess: "King",
    motto: "The King bull-dozes 2 steps forward.",
    classicMove: "The 1 OrthogDiagonal Step",
    color: "#ef4444",
    ability: "Somersault Assault",
    moves: "Steps 1 in any direction, or somersaults 2 squares straight, capturing any enemy in the way. Cannot pass through a square guarded by an enemy. Lose it and you lose the war.",
  },
  queen: {
    title: "Sacred Queen",
    role: "Elite",
    chess: "Queen",
    motto: "The Queen rides the sacred steed.",
    classicMove: "The ∞ Orthogonal & Diagonal",
    color: "#a855f7",
    ability: "8 Legged Gallop",
    moves: "Moves like a Queen AND a Knight. Can occupy any terrain, and leaps walls in L-shapes.",
  },
  rook: {
    title: "Twilight Fortress",
    role: "Heavy Armor",
    chess: "Rook",
    motto: "Rooks fortify the Swamps, Dusk-to-Dusk.",
    classicMove: "The ∞ Orthogonal",
    color: "#f59e0b",
    ability: "Four-Corners Fortnight",
    moves: "Moves like a Rook, plus 1 square diagonally. Cannot enter Forests or Mountains. Thrives in Swamps.",
  },
  bishop: {
    title: "Light Seer",
    role: "Ranged",
    chess: "Bishop",
    motto: "The Bishop hunts the Forest with Light.",
    classicMove: "The ∞ Diagonal",
    color: "#10b981",
    ability: "Leap of Faith",
    moves: "Moves diagonally like a Bishop, plus a 2-square straight jump. Gains cover in Forests. Blocked by Swamps and Mountains.",
  },
  knight: {
    title: "Shadow Knight",
    role: "Cavalry",
    chess: "Knight",
    motto: "The Knight rides the Mountains under Dark.",
    classicMove: "The L-Shape Trot",
    color: "#94a3b8",
    ability: "Triple-Bar Jump",
    moves: "Leaps in an L-shape, plus a 3-square straight jump, over units and walls. Thrives in Mountains. Bogs down in Swamps and Forests.",
  },
  pawn: {
    title: "Nimbus Jumper",
    role: "Infantry",
    chess: "Pawn",
    motto: "The Pawn learns the way of the backflip.",
    classicMove: "The Forward March",
    color: "#3b82f6",
    ability: "Double-back Flip",
    moves: "Moves like a Pawn, but can Backflip 2 squares backward (or 2 back and 1 aside to capture). Crosses any terrain. Promotes on the far edge.",
  },
};

export interface TerrainLore {
  name: string;
  subtitle: string;
  text: string;
  color: string;
}

export const TERRAIN_LORE: Record<Terrain, TerrainLore> = {
  flat: { name: "Plains", subtitle: "Open Ground", text: "Open ground. Every chessman may pass.", color: "#86b34e" },
  forest: { name: "Forests", subtitle: "The Whispering Woods", text: "Sanctuary for Kings, Queens, Bishops and Pawns. Impassable for Rooks and Knights. Units here are hidden in fog unless an enemy stands adjacent.", color: "#22a04b" },
  swamp: { name: "Swamps", subtitle: "The Sunken Realm", text: "Sanctuary for Rooks. Impassable for Bishops and Knights.", color: "#2f7de1" },
  mountain: { name: "Mountains", subtitle: "The Iron Peaks", text: "Sanctuary for Knights. Impassable for Rooks and Bishops.", color: "#e0393e" },
  desert: { name: "Deserts", subtitle: "The Endless Sands", text: "Home to all, but none can stay. Sliders must stop on entering, and a unit must exit on its very next turn or be lost.", color: "#f1b520" },
};
