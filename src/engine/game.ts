import type { Cell, GameConfig, GameState, Order, PlayerId, Pos, Terrain, TurnEvent, Unit } from "./types";
import { BOARD_SIZE, opponent } from "./rules";
import { findKing, forEachUnit, isInCheck, pseudoMovesFor } from "./moves";

export const emptyGrid = <T>(fill: T, size = BOARD_SIZE): T[][] =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => fill));

export const cloneState = (s: GameState): GameState => ({
  ...s,
  board: s.board.map((row) => row.slice()),
  terrain: s.terrain,
  acted: s.acted.slice(),
  fallen: [s.fallen[0].slice(), s.fallen[1].slice()],
  classicMoves: s.classicMoves,
});

export const createGame = (board: Cell[][], terrain: Terrain[][], config: GameConfig): GameState => ({
  board,
  terrain,
  current: 0,
  ordersPerTurn: config.ordersPerTurn,
  ordersLeft: 1,
  checkEndsTurn: config.checkEndsTurn ?? true,
  turnStart: null,
  acted: [],
  turn: 1,
  outcome: null,
  fallen: [[], []],
  nextId: 1000,
  classicMoves: config.classicMoves ?? false,
});

const unitAt = (s: GameState, [r, c]: Pos): Cell => s.board[r][c];

export const pseudoOrders = (s: GameState): Order[] => {
  const out: Order[] = [];
  forEachUnit(s.board, (u, pos) => {
    if (u.owner === s.current && !s.acted.includes(u.id)) out.push(...pseudoMovesFor(s.board, s.terrain, pos, true, s.classicMoves));
  });
  return out;
};

const resolveOrder = (s: GameState, order: Order): Unit[] => {
  const mover = unitAt(s, order.from)!;
  const victims: Unit[] = [];
  for (const [r, c] of order.captures) {
    const v = s.board[r][c];
    if (v) victims.push(v);
    s.board[r][c] = null;
  }
  s.board[order.from[0]][order.from[1]] = null;
  const placed: Unit = { ...mover, moved: true, type: order.promotes ? "queen" : mover.type };
  s.board[order.to[0]][order.to[1]] = placed;
  s.acted.push(mover.id);
  s.fallen[opponent(mover.owner)].push(...victims);
  return victims;
};

const leavesKingSafe = (s: GameState, order: Order): boolean => {
  const next = cloneState(s);
  resolveOrder(next, order);
  return !isInCheck(next, s.current);
};

const givesCheck = (s: GameState, order: Order): boolean => {
  const next = cloneState(s);
  resolveOrder(next, order);
  return isInCheck(next, opponent(s.current));
};

const isSecondOrder = (s: GameState): boolean => s.checkEndsTurn && s.turnStart !== null && s.acted.length === 1;

/** The 2nd order replayed as if the 1st never happened, or null when it only works because of the 1st. */
const withoutFirst = (s: GameState, order: Order): Order | null => {
  const start = s.turnStart!;
  const probe: GameState = { ...s, board: start.board.map((row) => row.slice()), acted: [], fallen: [start.fallen[0].slice(), start.fallen[1].slice()] };
  const twin = pseudoMovesFor(probe.board, s.terrain, order.from, true, s.classicMoves).find((o) => o.to[0] === order.to[0] && o.to[1] === order.to[1]);
  return twin && leavesKingSafe(probe, twin) ? twin : null;
};

export const isLegal = (s: GameState, order: Order): boolean => {
  if (!leavesKingSafe(s, order)) return false;
  // A checking 2nd order recalls the 1st piece, so it has to stand on its own.
  return !isSecondOrder(s) || !givesCheck(s, order) || withoutFirst(s, order) !== null;
};

export const legalOrders = (s: GameState): Order[] => (s.outcome ? [] : pseudoOrders(s).filter((o) => isLegal(s, o)));

const desertAttrition = (s: GameState): TurnEvent[] => {
  const events: TurnEvent[] = [];
  forEachUnit(s.board, (u, [r, c]) => {
    if (u.owner !== s.current || s.terrain[r][c] !== "desert" || s.acted.includes(u.id)) return;
    s.board[r][c] = null;
    s.fallen[u.owner].push(u);
    events.push({ kind: "perish", player: u.owner, victims: [u], at: [r, c] });
  });
  return events;
};

const kingOutcome = (s: GameState): void => {
  for (const p of [0, 1] as PlayerId[]) {
    if (findKing(s.board, p)) continue;
    const lostInDesert = s.fallen[p].some((u) => u.type === "king") && s.current === p;
    s.outcome = { winner: opponent(p), reason: lostInDesert ? "desert" : "king-captured" };
  }
};

const startTurn = (s: GameState, detectMate: boolean): void => {
  s.current = opponent(s.current);
  s.turn += 1;
  s.ordersLeft = s.ordersPerTurn;
  s.acted = [];
  s.turnStart = null;
  if (s.outcome || !detectMate) return;
  if (legalOrders(s).length > 0) return;
  const mated = isInCheck(s, s.current);
  s.outcome = { winner: mated ? opponent(s.current) : null, reason: mated ? "checkmate" : "stalemate" };
};

export const endTurn = (s: GameState, detectMate = true): TurnEvent[] => {
  const events = desertAttrition(s);
  kingOutcome(s);
  startTurn(s, detectMate);
  events.push({ kind: "turn", player: s.current, victims: [] });
  return events;
};

const snapshotTurn = (s: GameState): void => {
  if (s.acted.length > 0 || s.ordersLeft < 2) return;
  s.turnStart = { board: s.board.map((row) => row.slice()), fallen: [s.fallen[0].slice(), s.fallen[1].slice()] };
};

/** Undo the 1st order and replay the checking 2nd one on the board as it stood at the start of the turn. */
const recallFirst = (s: GameState, twin: Order): TurnEvent => {
  const start = s.turnStart!;
  const first = s.acted[0];
  s.board = start.board.map((row) => row.slice());
  s.fallen = [start.fallen[0].slice(), start.fallen[1].slice()];
  s.acted = [];
  resolveOrder(s, twin);
  s.acted.unshift(first);
  let at: Pos | undefined;
  forEachUnit(s.board, (u, pos) => {
    if (u.id === first) at = pos;
  });
  return { kind: "recall", player: s.current, victims: [], at };
};

export const applyOrder = (s: GameState, order: Order, detectMate = true): TurnEvent[] => {
  const second = isSecondOrder(s);
  const twin = second ? withoutFirst(s, order) : null;
  snapshotTurn(s);
  const victims = resolveOrder(s, order);
  const events: TurnEvent[] = [{ kind: "order", player: s.current, order, victims }];
  if (order.promotes) events.push({ kind: "promote", player: s.current, victims: [], at: order.to });
  const gaveCheck = s.checkEndsTurn && isInCheck(s, opponent(s.current));
  if (gaveCheck && twin) events.push(recallFirst(s, twin));
  kingOutcome(s);
  s.ordersLeft = gaveCheck ? 0 : s.ordersLeft - 1;
  const exhausted = s.ordersLeft <= 0 || pseudoOrders(s).length === 0;
  if (s.outcome || !exhausted) return events;
  return events.concat(endTurn(s, detectMate));
};

export const unitsInDanger = (s: GameState): Pos[] => {
  const out: Pos[] = [];
  forEachUnit(s.board, (u, pos) => {
    const idle = !s.acted.includes(u.id);
    if (u.owner === s.current && idle && s.terrain[pos[0]][pos[1]] === "desert") out.push(pos);
  });
  return out;
};
