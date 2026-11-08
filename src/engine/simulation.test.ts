import { describe, expect, it } from "vitest";
import { applyOrder, createGame, endTurn, legalOrders } from "./game";
import { randomBattlefield, seededRng } from "./setup";
import { chooseOrder } from "./ai";
import { findKing } from "./moves";

describe("full games", () => {
  it.each([1, 2])("plays recruit-vs-recruit to a finish with %i orders per turn", (orders) => {
    const { board, terrain } = randomBattlefield(1234 + orders);
    const s = createGame(board, terrain, { ordersPerTurn: orders });
    const rng = seededRng(99);
    let plies = 0;
    while (!s.outcome && plies < 600) {
      const o = chooseOrder(s, "recruit", rng);
      if (o) {
        expect(legalOrders(s).some((l) => l.unitId === o.unitId && l.to[0] === o.to[0] && l.to[1] === o.to[1])).toBe(true);
        applyOrder(s, o);
      } else endTurn(s);
      plies++;
      if (!s.outcome) expect(findKing(s.board, s.current)).not.toBeNull();
    }
    expect(plies).toBeGreaterThan(4);
  });
});
