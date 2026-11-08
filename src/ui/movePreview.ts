import type { Cell, Terrain, UnitType } from "../engine/types";
import { emptyGrid } from "../engine/game";
import { pseudoMovesFor } from "../engine/moves";
import { canEnter } from "../engine/rules";

export type PreviewPart = "classic" | "upgrade" | "both";

const SIZE = 11;
const MID = 5;

type Rel = [number, number];

const CLASSIC: Record<UnitType, (dr: number, dc: number) => boolean> = {
  king: (dr, dc) => Math.max(Math.abs(dr), Math.abs(dc)) === 1,
  queen: (dr, dc) => dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc),
  rook: (dr, dc) => (dr === 0 || dc === 0) && Math.abs(dr) + Math.abs(dc) > 0,
  bishop: (dr, dc) => Math.abs(dr) === Math.abs(dc),
  knight: (dr, dc) => Math.abs(dr * dc) === 2,
  pawn: (dr, dc) => dr === -1 || (dr === -2 && dc === 0),
};

const SANCTUARY: Partial<Record<Terrain, UnitType[]>> = {
  forest: ["king", "queen", "pawn", "bishop"],
  swamp: ["king", "queen", "pawn", "rook"],
  mountain: ["king", "queen", "pawn", "knight"],
};

const reach = (type: UnitType, terrain: Terrain, foes: boolean): Set<string> => {
  const board = emptyGrid<Cell>(null);
  const field = emptyGrid<Terrain>(terrain);
  field[MID][MID] = "flat";
  if (foes) board.forEach((row, r) => row.forEach((_, c) => (board[r][c] = { id: 900 + r * 12 + c, type: "pawn", owner: 1 })));
  board[MID][MID] = { id: 1, type, owner: 0 };
  return new Set(pseudoMovesFor(board, field, [MID, MID], false).map((o) => `${o.to[0] - MID},${o.to[1] - MID}`));
};

const inPart = (type: UnitType, part: PreviewPart, [dr, dc]: Rel): boolean => {
  if (part === "both") return true;
  return CLASSIC[type](dr, dc) === (part === "classic");
};

interface CellKind {
  cls: string;
  mark: string;
}

const classify = (type: UnitType, part: PreviewPart, rel: Rel, sets: Record<string, Set<string>>): CellKind => {
  const key = rel.join(",");
  if (!inPart(type, part, rel)) return { cls: "", mark: "" };
  const ideal = sets.flatMove.has(key) || sets.flatHit.has(key);
  if (!ideal) return { cls: "", mark: "" };
  const live = sets.move.has(key) || sets.hit.has(key);
  if (!live) return { cls: "blocked", mark: "✕" };
  if (!sets.move.has(key)) return { cls: "attack", mark: "⚔" };
  return { cls: CLASSIC[type](rel[0], rel[1]) ? "move" : "upgrade", mark: "" };
};

export const moveBoard = (type: UnitType, part: PreviewPart, terrain: Terrain, icon: string): HTMLElement => {
  const sets = {
    flatMove: reach(type, "flat", false),
    flatHit: reach(type, "flat", true),
    move: reach(type, terrain, false),
    hit: reach(type, terrain, true),
  };
  const grid = document.createElement("div");
  grid.className = "mp-grid";
  const sanctuary = SANCTUARY[terrain]?.includes(type) && canEnter(type, terrain);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement("span");
      const center = r === MID && c === MID;
      const kind = classify(type, part, [r - MID, c - MID], sets);
      const shade = (r + c) % 2 ? "dark" : "light";
      cell.className = `mp-cell ${shade} ${terrain !== "flat" && !center ? `t-${terrain}` : ""} ${kind.cls}`;
      cell.textContent = kind.mark;
      if (center) cell.innerHTML = `<img src="${icon}" alt=""/>${sanctuary ? '<i class="shield">⛨</i>' : ""}`;
      grid.appendChild(cell);
    }
  }
  return grid;
};
