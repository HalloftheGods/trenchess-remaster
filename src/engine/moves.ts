import type { Cell, GameState, MoveStyle, Order, PlayerId, Pos, Terrain, Unit } from "./types";
import { canEnter, forwardOf, inBounds, promotionRow } from "./rules";

type Dir = readonly [number, number];

const ORTHO: Dir[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG: Dir[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT: Dir[] = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const scale = (dirs: Dir[], n: number): Dir[] => dirs.map(([r, c]) => [r * n, c * n] as Dir);

interface Ctx {
  board: Cell[][];
  terrain: Terrain[][];
  unit: Unit;
  from: Pos;
  out: Order[];
  guard: boolean;
}

const makeOrder = (ctx: Ctx, to: Pos, style: MoveStyle, captures: Pos[], path: Pos[]): Order => ({
  unitId: ctx.unit.id,
  from: ctx.from,
  to,
  style,
  captures,
  path,
  promotes: ctx.unit.type === "pawn" && to[0] === promotionRow(ctx.unit.owner),
});

const isFoe = (cell: Cell, owner: PlayerId): boolean => cell !== null && cell.owner !== owner;

const slide = (ctx: Ctx, dirs: Dir[]): void => {
  const [r0, c0] = ctx.from;
  for (const [dr, dc] of dirs) {
    const path: Pos[] = [];
    let r = r0 + dr;
    let c = c0 + dc;
    while (inBounds(r, c) && canEnter(ctx.unit.type, ctx.terrain[r][c])) {
      const cell = ctx.board[r][c];
      if (cell && cell.owner === ctx.unit.owner) break;
      path.push([r, c]);
      const captures: Pos[] = cell ? [[r, c]] : [];
      ctx.out.push(makeOrder(ctx, [r, c], "slide", captures, [...path]));
      if (cell || ctx.terrain[r][c] === "desert") break;
      r += dr;
      c += dc;
    }
  }
};

const leap = (ctx: Ctx, dirs: Dir[], style: MoveStyle): void => {
  const [r0, c0] = ctx.from;
  for (const [dr, dc] of dirs) {
    const r = r0 + dr;
    const c = c0 + dc;
    if (!inBounds(r, c) || !canEnter(ctx.unit.type, ctx.terrain[r][c])) continue;
    const cell = ctx.board[r][c];
    if (cell && cell.owner === ctx.unit.owner) continue;
    const captures: Pos[] = cell ? [[r, c]] : [];
    ctx.out.push(makeOrder(ctx, [r, c], style, captures, [[r, c]]));
  }
};

const isGuarded = (ctx: Ctx, [r, c]: Pos): boolean => {
  const probe = ctx.board.map((row) => row.slice());
  probe[ctx.from[0]][ctx.from[1]] = null;
  probe[r][c] = { ...ctx.unit, type: "pawn" };
  return isAttacked(probe, ctx.terrain, [r, c], ctx.unit.owner === 0 ? 1 : 0, false);
};

const joust = (ctx: Ctx): void => {
  const [r0, c0] = ctx.from;
  for (const [dr, dc] of ORTHO) {
    const r = r0 + dr * 2;
    const c = c0 + dc * 2;
    if (!inBounds(r, c) || !canEnter("king", ctx.terrain[r][c])) continue;
    const mid: Pos = [r0 + dr, c0 + dc];
    const midCell = ctx.board[mid[0]][mid[1]];
    const target = ctx.board[r][c];
    if (midCell?.owner === ctx.unit.owner || target?.owner === ctx.unit.owner) continue;
    if (ctx.guard && isGuarded(ctx, mid)) continue;
    const captures: Pos[] = [];
    if (midCell) captures.push(mid);
    if (target) captures.push([r, c]);
    ctx.out.push(makeOrder(ctx, [r, c], "joust", captures, [mid, [r, c]]));
  }
};

const pawnMoves = (ctx: Ctx): void => {
  const [r0, c0] = ctx.from;
  const f = forwardOf(ctx.unit.owner);
  const owner = ctx.unit.owner;
  const tryMove = (r: number, c: number, style: MoveStyle) => {
    if (inBounds(r, c) && ctx.board[r][c] === null) ctx.out.push(makeOrder(ctx, [r, c], style, [], [[r, c]]));
  };
  const tryCapture = (r: number, c: number, style: MoveStyle) => {
    if (inBounds(r, c) && isFoe(ctx.board[r][c], owner)) ctx.out.push(makeOrder(ctx, [r, c], style, [[r, c]], [[r, c]]));
  };
  tryMove(r0 + f, c0, "step");
  tryCapture(r0 + f, c0 + 1, "step");
  tryCapture(r0 + f, c0 - 1, "step");
  tryMove(r0 - 2 * f, c0, "flip");
  tryCapture(r0 - 2 * f, c0 + 1, "flip");
  tryCapture(r0 - 2 * f, c0 - 1, "flip");
};

const GENERATORS: Record<Unit["type"], (ctx: Ctx) => void> = {
  pawn: pawnMoves,
  knight: (ctx) => {
    leap(ctx, KNIGHT, "jump");
    leap(ctx, scale(ORTHO, 3), "jump");
  },
  bishop: (ctx) => {
    slide(ctx, DIAG);
    leap(ctx, scale(ORTHO, 2), "jump");
  },
  rook: (ctx) => {
    slide(ctx, ORTHO);
    leap(ctx, DIAG, "step");
  },
  queen: (ctx) => {
    slide(ctx, [...ORTHO, ...DIAG]);
    leap(ctx, KNIGHT, "jump");
  },
  king: (ctx) => {
    leap(ctx, [...ORTHO, ...DIAG], "step");
    joust(ctx);
  },
};

export const pseudoMovesFor = (board: Cell[][], terrain: Terrain[][], from: Pos, guard = true): Order[] => {
  const unit = board[from[0]][from[1]];
  if (!unit) return [];
  const ctx: Ctx = { board, terrain, unit, from, out: [], guard };
  GENERATORS[unit.type](ctx);
  return ctx.out;
};

export const forEachUnit = (board: Cell[][], fn: (unit: Unit, pos: Pos) => void): void => {
  board.forEach((row, r) => row.forEach((cell, c) => cell && fn(cell, [r, c])));
};

export const findKing = (board: Cell[][], player: PlayerId): Pos | null => {
  let found: Pos | null = null;
  forEachUnit(board, (u, pos) => {
    if (u.type === "king" && u.owner === player) found = pos;
  });
  return found;
};

export const isAttacked = (board: Cell[][], terrain: Terrain[][], target: Pos, by: PlayerId, guard = false): boolean => {
  const hits = (o: Order) => o.captures.some(([r, c]) => r === target[0] && c === target[1]);
  let attacked = false;
  forEachUnit(board, (u, pos) => {
    if (!attacked && u.owner === by) attacked = pseudoMovesFor(board, terrain, pos, guard).some(hits);
  });
  return attacked;
};

export const isInCheck = (state: Pick<GameState, "board" | "terrain">, player: PlayerId): boolean => {
  const king = findKing(state.board, player);
  return king !== null && isAttacked(state.board, state.terrain, king, player === 0 ? 1 : 0);
};
