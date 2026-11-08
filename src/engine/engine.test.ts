import { describe, expect, it } from "vitest";
import type { Cell, GameState, Terrain, Unit, UnitType, PlayerId, Pos } from "./types";
import { applyOrder, createGame, emptyGrid, legalOrders } from "./game";
import { isInCheck, pseudoMovesFor } from "./moves";
import { canDeployTo, createArmies, randomBattlefield, terrainCount } from "./setup";
import { chooseOrder } from "./ai";
import { TERRAIN_QUOTA } from "./rules";

let nextId = 1;
const put = (board: Cell[][], [r, c]: Pos, type: UnitType, owner: PlayerId): Unit => {
  const u = { id: nextId++, type, owner };
  board[r][c] = u;
  return u;
};

const blank = () => ({ board: emptyGrid<Cell>(null), terrain: emptyGrid<Terrain>("flat") });

const targets = (board: Cell[][], terrain: Terrain[][], from: Pos) =>
  pseudoMovesFor(board, terrain, from).map((o) => o.to.join(","));

const game = (board: Cell[][], terrain: Terrain[][], orders = 1): GameState => {
  const s = createGame(board, terrain, { ordersPerTurn: orders });
  s.ordersLeft = orders;
  return s;
};

describe("terrain", () => {
  it("blocks rooks from forests and stops their slide", () => {
    const { board, terrain } = blank();
    put(board, [5, 0], "rook", 0);
    terrain[5][3] = "forest";
    const t = targets(board, terrain, [5, 0]);
    expect(t).toContain("5,2");
    expect(t).not.toContain("5,3");
    expect(t).not.toContain("5,4");
  });

  it("lets sliders enter a desert but not pass it", () => {
    const { board, terrain } = blank();
    put(board, [5, 0], "rook", 0);
    terrain[5][3] = "desert";
    const t = targets(board, terrain, [5, 0]);
    expect(t).toContain("5,3");
    expect(t).not.toContain("5,4");
  });

  it("lets pawns walk on any terrain", () => {
    const { board, terrain } = blank();
    put(board, [6, 6], "pawn", 0);
    terrain[5][6] = "mountain";
    expect(targets(board, terrain, [6, 6])).toContain("5,6");
  });

  it("kills idle units in the desert at end of turn", () => {
    const { board, terrain } = blank();
    put(board, [11, 0], "king", 0);
    put(board, [0, 11], "king", 1);
    put(board, [6, 6], "knight", 0);
    put(board, [9, 9], "pawn", 0);
    terrain[6][6] = "desert";
    const s = game(board, terrain);
    const order = legalOrders(s).find((o) => o.from[0] === 9 && o.from[1] === 9 && o.to[0] === 8)!;
    const events = applyOrder(s, order);
    expect(events.some((e) => e.kind === "perish")).toBe(true);
    expect(s.board[6][6]).toBeNull();
  });
});

describe("upgraded moves", () => {
  it("gives knights a 3-square orthogonal jump", () => {
    const { board, terrain } = blank();
    put(board, [5, 5], "knight", 0);
    expect(targets(board, terrain, [5, 5])).toEqual(expect.arrayContaining(["2,5", "8,5", "5,2", "5,8", "3,4"]));
  });

  it("gives rooks a single diagonal step and bishops a 2-square orthogonal jump", () => {
    const { board, terrain } = blank();
    put(board, [5, 5], "rook", 0);
    put(board, [9, 9], "bishop", 0);
    expect(targets(board, terrain, [5, 5])).toContain("4,4");
    expect(targets(board, terrain, [5, 5])).not.toContain("3,3");
    expect(targets(board, terrain, [9, 9])).toContain("7,9");
  });

  it("lets the king joust over an enemy, capturing it", () => {
    const { board, terrain } = blank();
    put(board, [5, 5], "king", 0);
    put(board, [4, 5], "pawn", 1);
    put(board, [0, 0], "king", 1);
    const s = game(board, terrain);
    const j = legalOrders(s).find((o) => o.style === "joust" && o.to[0] === 3 && o.to[1] === 5)!;
    expect(j.captures).toEqual([[4, 5]]);
    applyOrder(s, j);
    expect(s.board[4][5]).toBeNull();
    expect(s.board[3][5]?.type).toBe("king");
  });

  it("lets pawns backflip two squares", () => {
    const { board, terrain } = blank();
    put(board, [6, 6], "pawn", 0);
    put(board, [8, 7], "rook", 1);
    const t = targets(board, terrain, [6, 6]);
    expect(t).toContain("8,6");
    expect(t).toContain("8,7");
    expect(t).not.toContain("8,5");
  });

  it("promotes pawns on the far rank", () => {
    const { board, terrain } = blank();
    put(board, [1, 6], "pawn", 0);
    put(board, [11, 0], "king", 0);
    put(board, [5, 11], "king", 1);
    const s = game(board, terrain);
    const o = legalOrders(s).find((x) => x.from[0] === 1 && x.to[0] === 0)!;
    applyOrder(s, o);
    expect(s.board[0][6]?.type).toBe("queen");
  });
});

describe("turns and victory", () => {
  it("forbids orders that leave the king attacked", () => {
    const { board, terrain } = blank();
    put(board, [11, 5], "king", 0);
    put(board, [10, 5], "rook", 0);
    put(board, [0, 5], "rook", 1);
    put(board, [0, 0], "king", 1);
    const s = game(board, terrain);
    const rookOrders = legalOrders(s).filter((o) => o.from[0] === 10);
    expect(rookOrders.every((o) => o.to[1] === 5)).toBe(true);
  });

  it("gives two orders per turn in command mode, one per unit", () => {
    const s = createGame(createArmies(), emptyGrid<Terrain>("flat"), { ordersPerTurn: 2 });
    expect(s.ordersLeft).toBe(1);
    applyOrder(s, legalOrders(s)[0]);
    expect(s.current).toBe(1);
    expect(s.ordersLeft).toBe(2);
    const first = legalOrders(s)[0];
    applyOrder(s, first);
    expect(s.current).toBe(1);
    expect(legalOrders(s).some((o) => o.unitId === first.unitId)).toBe(false);
  });

  it("detects checkmate", () => {
    const { board, terrain } = blank();
    put(board, [0, 0], "king", 1);
    put(board, [11, 11], "king", 0);
    put(board, [2, 1], "rook", 0);
    put(board, [5, 7], "queen", 0);
    const s = game(board, terrain);
    const mate = legalOrders(s).find((o) => o.from[0] === 5 && o.to[0] === 0 && o.to[1] === 7)!;
    applyOrder(s, mate);
    expect(isInCheck(s, 1)).toBe(true);
    expect(s.outcome).toEqual({ winner: 0, reason: "checkmate" });
  });
});

describe("setup", () => {
  it("builds a mirrored battlefield inside the terrain quota", () => {
    const { board, terrain } = randomBattlefield(42);
    expect(terrainCount(terrain, 0)).toBeLessThanOrEqual(TERRAIN_QUOTA);
    expect(terrainCount(terrain, 0)).toBeGreaterThan(8);
    expect(terrain[2][3]).toBe(terrain[9][8]);
    expect(board[9][6]?.type).toBe("king");
  });

  it("only deploys units into the back four rows", () => {
    const board = createArmies();
    const terrain = emptyGrid<Terrain>("flat");
    expect(canDeployTo(board, terrain, 0, [8, 2], [11, 0])).toBe(true);
    expect(canDeployTo(board, terrain, 0, [8, 2], [7, 2])).toBe(false);
  });
});

describe("ai", () => {
  it("takes a free queen", () => {
    const { board, terrain } = blank();
    put(board, [11, 0], "king", 0);
    put(board, [0, 11], "king", 1);
    put(board, [5, 5], "rook", 1);
    put(board, [5, 1], "queen", 0);
    const s = game(board, terrain);
    s.current = 1;
    const o = chooseOrder(s, "veteran");
    expect(o?.to).toEqual([5, 1]);
  });
});
