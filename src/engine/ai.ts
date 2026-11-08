import type { GameState, Order, PlayerId } from "./types";
import { BOARD_SIZE, UNIT_VALUE, forwardOf } from "./rules";
import { applyOrder, cloneState, legalOrders, pseudoOrders } from "./game";
import { forEachUnit } from "./moves";

export type Difficulty = "recruit" | "veteran" | "warlord";

interface Profile {
  maxDepth: number;
  budgetMs: number;
  noise: number;
}

const PROFILES: Record<Difficulty, Profile> = {
  recruit: { maxDepth: 1, budgetMs: 150, noise: 2.5 },
  veteran: { maxDepth: 3, budgetMs: 700, noise: 0.3 },
  warlord: { maxDepth: 5, budgetMs: 1800, noise: 0 },
};

const WIN = 100000;

class Timeout extends Error {}

const centerBonus = (r: number, c: number): number => {
  const mid = (BOARD_SIZE - 1) / 2;
  return (6 - Math.abs(r - mid) - Math.abs(c - mid)) * 0.04;
};

const unitScore = (s: GameState, type: keyof typeof UNIT_VALUE, owner: PlayerId, r: number, c: number): number => {
  let v = UNIT_VALUE[type];
  if (type === "pawn") v += Math.abs(r - (owner === 0 ? BOARD_SIZE - 1 : 0)) * 0.05 * Math.abs(forwardOf(owner));
  if (type === "knight" || type === "bishop" || type === "queen") v += centerBonus(r, c);
  if (s.terrain[r][c] === "desert") v -= type === "king" ? 30 : UNIT_VALUE[type] * 0.35;
  return v;
};

export const evaluate = (s: GameState, me: PlayerId): number => {
  if (s.outcome) return s.outcome.winner === null ? 0 : s.outcome.winner === me ? WIN : -WIN;
  let score = 0;
  forEachUnit(s.board, (u, [r, c]) => {
    const v = unitScore(s, u.type, u.owner, r, c);
    score += u.owner === me ? v : -v;
  });
  return score;
};

const orderPriority = (s: GameState, o: Order): number => {
  let p = 0;
  for (const [r, c] of o.captures) p += UNIT_VALUE[s.board[r][c]!.type] * 10;
  if (o.captures.length) p -= UNIT_VALUE[s.board[o.from[0]][o.from[1]]!.type];
  return o.promotes ? p + 80 : p;
};

const ordered = (s: GameState, orders: Order[]): Order[] =>
  orders
    .map((o) => ({ o, p: orderPriority(s, o) }))
    .sort((a, b) => b.p - a.p)
    .map((x) => x.o);

interface Search {
  me: PlayerId;
  deadline: number;
  nodes: number;
}

const child = (s: GameState, o: Order): GameState => {
  const next = cloneState(s);
  applyOrder(next, o, false);
  return next;
};

const alphabeta = (s: GameState, depth: number, alpha: number, beta: number, ctx: Search): number => {
  if ((++ctx.nodes & 511) === 0 && performance.now() > ctx.deadline) throw new Timeout();
  if (depth === 0 || s.outcome) return evaluate(s, ctx.me) + (s.outcome ? depth : 0);
  const orders = ordered(s, pseudoOrders(s));
  if (orders.length === 0) return evaluate(s, ctx.me);
  const maximizing = s.current === ctx.me;
  let best = maximizing ? -Infinity : Infinity;
  for (const o of orders) {
    const v = alphabeta(child(s, o), depth - 1, alpha, beta, ctx);
    if (maximizing) {
      best = Math.max(best, v);
      alpha = Math.max(alpha, v);
    } else {
      best = Math.min(best, v);
      beta = Math.min(beta, v);
    }
    if (beta <= alpha) break;
  }
  return best;
};

const rankRoot = (s: GameState, roots: Order[], depth: number, ctx: Search): { o: Order; v: number }[] => {
  const scored = roots.map((o) => ({ o, v: alphabeta(child(s, o), depth - 1, -Infinity, Infinity, ctx) }));
  return scored.sort((a, b) => b.v - a.v);
};

export const chooseOrder = (s: GameState, difficulty: Difficulty, rng: () => number = Math.random): Order | null => {
  const profile = PROFILES[difficulty];
  let roots = ordered(s, legalOrders(s));
  if (roots.length <= 1) return roots[0] ?? null;
  const ctx: Search = { me: s.current, deadline: performance.now() + profile.budgetMs, nodes: 0 };
  let ranked = roots.map((o) => ({ o, v: 0 }));
  for (let depth = 1; depth <= profile.maxDepth; depth++) {
    try {
      ranked = rankRoot(s, roots, depth, ctx);
      roots = ranked.map((x) => x.o);
    } catch (e) {
      if (!(e instanceof Timeout)) throw e;
      break;
    }
  }
  const noisy = ranked.map((x) => ({ o: x.o, v: x.v + (rng() - 0.5) * profile.noise }));
  noisy.sort((a, b) => b.v - a.v);
  return noisy[0].o;
};
