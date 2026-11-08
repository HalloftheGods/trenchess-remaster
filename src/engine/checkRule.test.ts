import { describe, expect, it } from "vitest";
import type { Cell, Order, PlayerId, Pos, Terrain, UnitType } from "./types";
import { applyOrder, createGame, emptyGrid, legalOrders } from "./game";

let nextId = 1;
const setup = (pieces: [Pos, UnitType, PlayerId][], checkEndsTurn = true) => {
  const board = emptyGrid<Cell>(null);
  const ids: Record<string, number> = {};
  for (const [[r, c], type, owner] of pieces) {
    const id = nextId++;
    board[r][c] = { id, type, owner };
    ids[`${r},${c}`] = id;
  }
  const s = createGame(board, emptyGrid<Terrain>("flat"), { ordersPerTurn: 2, checkEndsTurn });
  s.ordersLeft = 2;
  return { s, ids };
};

const find = (orders: Order[], from: Pos, to: Pos): Order | undefined =>
  orders.find((o) => o.from.join() === from.join() && o.to.join() === to.join());

const order = (s: ReturnType<typeof setup>["s"], from: Pos, to: Pos): Order => {
  const o = find(legalOrders(s), from, to);
  if (!o) throw new Error(`no legal order ${from} -> ${to}`);
  return o;
};

const idAt = (s: ReturnType<typeof setup>["s"], [r, c]: Pos) => s.board[r][c]?.id;

describe("Command check rule", () => {
  const base: [Pos, UnitType, PlayerId][] = [
    [[11, 0], "king", 0],
    [[0, 6], "king", 1],
    [[11, 11], "rook", 0],
    [[11, 5], "knight", 0],
  ];

  it("ends the turn when the first order gives check", () => {
    const { s } = setup(base);
    applyOrder(s, order(s, [11, 11], [0, 11]));
    expect(s.current).toBe(1);
    expect(s.turn).toBe(2);
  });

  it("recalls the first piece when the second order gives check", () => {
    const { s, ids } = setup(base);
    applyOrder(s, order(s, [11, 5], [9, 4]));
    expect(s.current).toBe(0);
    const events = applyOrder(s, order(s, [11, 11], [0, 11]));
    expect(events.some((e) => e.kind === "recall")).toBe(true);
    expect(idAt(s, [11, 5])).toBe(ids["11,5"]);
    expect(idAt(s, [9, 4])).toBeUndefined();
    expect(idAt(s, [0, 11])).toBe(ids["11,11"]);
    expect(s.current).toBe(1);
  });

  it("restores a piece the first order captured", () => {
    const { s } = setup([...base, [[9, 4], "pawn", 1]]);
    applyOrder(s, order(s, [11, 5], [9, 4]));
    expect(s.fallen[1]).toHaveLength(1);
    applyOrder(s, order(s, [11, 11], [0, 11]));
    expect(s.board[9][4]?.type).toBe("pawn");
    expect(s.fallen[1]).toHaveLength(0);
  });

  it("forbids a second-order check that only works because of the first order", () => {
    const { s } = setup([
      [[11, 0], "king", 0],
      [[0, 5], "king", 1],
      [[5, 5], "knight", 0],
      [[5, 8], "rook", 0],
    ]);
    applyOrder(s, order(s, [5, 5], [7, 4]));
    expect(s.current).toBe(0);
    expect(find(legalOrders(s), [5, 8], [5, 5])).toBeUndefined();
    expect(find(legalOrders(s), [5, 8], [0, 8])).toBeDefined();
  });

  it("keeps both orders when the rule is off", () => {
    const { s, ids } = setup(base, false);
    applyOrder(s, order(s, [11, 5], [9, 4]));
    applyOrder(s, order(s, [11, 11], [0, 11]));
    expect(idAt(s, [9, 4])).toBe(ids["11,5"]);
  });
});
