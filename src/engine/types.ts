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
  kind: "order" | "perish" | "promote" | "turn" | "recall";
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
  /** Command check rule: a check ends the turn, and a check on the 2nd order sends the 1st piece back. */
  checkEndsTurn: boolean;
  /** Board as it stood before this turn's first order, kept so a checking 2nd order can recall the 1st. */
  turnStart: TurnStart | null;
  acted: number[];
  turn: number;
  outcome: Outcome | null;
  fallen: Unit[][];
  nextId: number;
  /** When true, pieces only have classic chess moves (no backflips, jousts, knight gallops). */
  classicMoves?: boolean;
}

export interface TurnStart {
  board: Cell[][];
  fallen: Unit[][];
}

export interface GameConfig {
  ordersPerTurn: number;
  /** Defaults to true. */
  checkEndsTurn?: boolean;
  classicMoves?: boolean;
}
