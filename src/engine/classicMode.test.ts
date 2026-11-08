import { describe, expect, it } from "vitest";
import { emptyGrid } from "./game";
import { pseudoMovesFor } from "./moves";
import { createArmies } from "./setup";
import { setBoard } from "./rules";
import { createGame, applyOrder, legalOrders } from "./game";
import { chooseOrder } from "./ai";
import type { Cell, Terrain } from "./types";

describe("classic chess moves vs trenchess moves", () => {
  const terrain = emptyGrid<Terrain>("flat", 8);

  it("restricts pawn from backflipping in classic mode", () => {
    const board = emptyGrid<Cell>(null, 8);
    // White pawn at [4, 4] that has moved
    board[4][4] = { id: 1, type: "pawn", owner: 0, moved: true };

    const trenchessMoves = pseudoMovesFor(board, terrain, [4, 4], false, false);
    const hasBackflip = trenchessMoves.some((m) => m.style === "flip");
    expect(hasBackflip).toBe(true);

    const classicMoves = pseudoMovesFor(board, terrain, [4, 4], false, true);
    const hasClassicBackflip = classicMoves.some((m) => m.style === "flip");
    expect(hasClassicBackflip).toBe(false);
    expect(classicMoves.every((m) => m.style === "step" || m.style === "jump")).toBe(true);
  });

  it("restricts knight from 3-square straight leaps in classic mode", () => {
    const board = emptyGrid<Cell>(null, 8);
    board[4][4] = { id: 2, type: "knight", owner: 0 };

    const trenchessMoves = pseudoMovesFor(board, terrain, [4, 4], false, false);
    // 3-square leap goes to [1, 4], [7, 4], [4, 1], [4, 7]
    const hasThreeStraight = trenchessMoves.some((m) => m.to[0] === 1 && m.to[1] === 4);
    expect(hasThreeStraight).toBe(true);

    const classicMoves = pseudoMovesFor(board, terrain, [4, 4], false, true);
    const hasClassicThreeStraight = classicMoves.some((m) => m.to[0] === 1 && m.to[1] === 4);
    expect(hasClassicThreeStraight).toBe(false);
    expect(classicMoves.length).toBe(8);
  });

  it("restricts bishop from 2-square straight leaps in classic mode", () => {
    const board = emptyGrid<Cell>(null, 8);
    board[4][4] = { id: 3, type: "bishop", owner: 0 };

    const trenchessMoves = pseudoMovesFor(board, terrain, [4, 4], false, false);
    const hasOrthoLeap = trenchessMoves.some((m) => m.to[0] === 2 && m.to[1] === 4);
    expect(hasOrthoLeap).toBe(true);

    const classicMoves = pseudoMovesFor(board, terrain, [4, 4], false, true);
    const hasClassicOrthoLeap = classicMoves.some((m) => m.to[0] === 2 && m.to[1] === 4);
    expect(hasClassicOrthoLeap).toBe(false);
    // All classic bishop moves are diagonal
    expect(classicMoves.every((m) => Math.abs(m.to[0] - 4) === Math.abs(m.to[1] - 4))).toBe(true);
  });

  it("restricts rook from diagonal steps in classic mode", () => {
    const board = emptyGrid<Cell>(null, 8);
    board[4][4] = { id: 4, type: "rook", owner: 0 };

    const trenchessMoves = pseudoMovesFor(board, terrain, [4, 4], false, false);
    const hasDiagStep = trenchessMoves.some((m) => Math.abs(m.to[0] - 4) === 1 && Math.abs(m.to[1] - 4) === 1);
    expect(hasDiagStep).toBe(true);

    const classicMoves = pseudoMovesFor(board, terrain, [4, 4], false, true);
    const hasClassicDiagStep = classicMoves.some((m) => Math.abs(m.to[0] - 4) === 1 && Math.abs(m.to[1] - 4) === 1);
    expect(hasClassicDiagStep).toBe(false);
    // All classic rook moves are orthogonal
    expect(classicMoves.every((m) => m.to[0] === 4 || m.to[1] === 4)).toBe(true);
  });

  it("restricts queen from knight leaps in classic mode", () => {
    const board = emptyGrid<Cell>(null, 8);
    board[4][4] = { id: 5, type: "queen", owner: 0 };

    const trenchessMoves = pseudoMovesFor(board, terrain, [4, 4], false, false);
    const hasKnightLeap = trenchessMoves.some((m) => Math.abs((m.to[0] - 4) * (m.to[1] - 4)) === 2);
    expect(hasKnightLeap).toBe(true);

    const classicMoves = pseudoMovesFor(board, terrain, [4, 4], false, true);
    const hasClassicKnightLeap = classicMoves.some((m) => Math.abs((m.to[0] - 4) * (m.to[1] - 4)) === 2);
    expect(hasClassicKnightLeap).toBe(false);
  });

  it("restricts king from somersault jousting in classic mode", () => {
    const board = emptyGrid<Cell>(null, 8);
    board[4][4] = { id: 6, type: "king", owner: 0 };

    const trenchessMoves = pseudoMovesFor(board, terrain, [4, 4], false, false);
    const hasJoust = trenchessMoves.some((m) => m.style === "joust");
    expect(hasJoust).toBe(true);

    const classicMoves = pseudoMovesFor(board, terrain, [4, 4], false, true);
    const hasClassicJoust = classicMoves.some((m) => m.style === "joust");
    expect(hasClassicJoust).toBe(false);
    expect(classicMoves.every((m) => Math.max(Math.abs(m.to[0] - 4), Math.abs(m.to[1] - 4)) === 1)).toBe(true);
  });
});

describe("Tau classic mode match play", () => {
  it("plays classic moves with standard opening setup on 8x8", () => {
    setBoard("classic");
    const board = createArmies();
    const terrain = emptyGrid<Terrain>("flat", 8);
    const state = createGame(board, terrain, { ordersPerTurn: 1, classicMoves: true });

    expect(state.classicMoves).toBe(true);
    expect(state.ordersPerTurn).toBe(1);

    // Initial legal orders for player 0 (pawns and knights only)
    const initialOrders = legalOrders(state);
    expect(initialOrders.length).toBe(20); // 16 pawn moves (each pawn can step 1 or 2) + 4 knight moves
    expect(initialOrders.every((o) => o.style === "step" || o.style === "jump")).toBe(true);

    // Make an opening order: e2-e4 (in 0-indexed coords: [6, 4] to [4, 4])
    const e4 = initialOrders.find((o) => o.from[0] === 6 && o.from[1] === 4 && o.to[0] === 4 && o.to[1] === 4);
    expect(e4).toBeDefined();
    applyOrder(state, e4!);

    expect(state.current).toBe(1);
    expect(state.turn).toBe(2);

    // Black makes an AI move
    const blackOrder = chooseOrder(state, "recruit");
    expect(blackOrder).toBeDefined();
    applyOrder(state, blackOrder!);

    expect(state.current).toBe(0);
    expect(state.turn).toBe(3);
  });
});
