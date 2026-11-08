export type PlayerId = 0 | 1;

export type UnitType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";

export type Terrain = "flat" | "forest" | "swamp" | "mountain" | "desert";

export type Pos = readonly [number, number];

export interface Unit {
  id: number;
  type: UnitType;
  owner: PlayerId;
  /** Set once the unit has taken an order; a pawn that has not may jumpstart two squares. */
  moved?: boolean;
}

export type Cell = Unit | null;

export type MoveStyle = "step" | "slide" | "jump" | "joust" | "flip";

export interface Order {
  unitId: number;
  from: Pos;
  to: Pos;
  style: MoveStyle;
  captures: Pos[];
  path: Pos[];
  promotes: boolean;
}

export type WinReason = "king-captured" | "checkmate" | "desert" | "stalemate" | "resign";

export interface Outcome {
  winner: PlayerId | null;
  reason: WinReason;
}

export interface TurnEvent {
  kind: "order" | "perish" | "promote" | "turn";
  player: PlayerId;
  order?: Order;
  victims: Unit[];
  at?: Pos;
}

export interface GameState {
  board: Cell[][];
  terrain: Terrain[][];
  current: PlayerId;
  ordersPerTurn: number;
  ordersLeft: number;
  acted: number[];
  turn: number;
  outcome: Outcome | null;
  fallen: Unit[][];
  nextId: number;
}

export interface GameConfig {
  ordersPerTurn: number;
}
