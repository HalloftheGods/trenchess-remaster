import { afterEach, describe, expect, it } from "vitest";
import { applyOrder, createGame, endTurn } from "./game";
import { createArmies, randomBattlefield, seededRng, terrainCount } from "./setup";
import { chooseOrder } from "./ai";
import { findKing, forEachUnit } from "./moves";
import { BOARD_SIZE, TERRAIN_QUOTA, deployRows, setBoard } from "./rules";

afterEach(() => setBoard("extended"));

describe("board sizes", () => {
  it("lays the Classic 8x8 board out like a chessboard", () => {
    setBoard("classic");
    const board = createArmies();
    expect(board.length).toBe(8);
    expect(board[7].map((u) => u?.type)).toEqual(["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"]);
    expect(board[6].every((u) => u?.type === "pawn" && u.owner === 0)).toBe(true);
    expect(board[0][4]?.type).toBe("king");
    expect(board[1].every((u) => u?.type === "pawn" && u.owner === 1)).toBe(true);
    expect(deployRows(0)).toEqual([4, 7]);
  });

  it("keeps the Extended 12x12 layout", () => {
    setBoard("extended");
    const board = createArmies();
    expect(BOARD_SIZE).toBe(12);
    expect(board[9][6]?.type).toBe("king");
    expect(board[8][2]?.type).toBe("pawn");
  });

  it("caps random terrain to the Classic quota", () => {
    setBoard("classic");
    const { terrain } = randomBattlefield(7);
    expect(terrain.length).toBe(8);
    expect(terrainCount(terrain, 0)).toBeLessThanOrEqual(TERRAIN_QUOTA);
    expect(TERRAIN_QUOTA).toBe(8);
  });

  it("plays a Classic game to the end without leaving the board", () => {
    setBoard("classic");
    const { board, terrain } = randomBattlefield(31);
    const s = createGame(board, terrain, { ordersPerTurn: 1 });
    const rng = seededRng(5);
    for (let plies = 0; !s.outcome && plies < 400; plies++) {
      const o = chooseOrder(s, "recruit", rng);
      if (o) applyOrder(s, o);
      else endTurn(s);
      forEachUnit(s.board, (_, [r, c]) => expect(r < 8 && c < 8).toBe(true));
      if (!s.outcome) expect(findKing(s.board, s.current)).not.toBeNull();
    }
  });
});
