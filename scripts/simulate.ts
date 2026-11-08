/**
 * Headless AI-vs-AI simulator for Trenchess.
 *
 * Plays many games with the real rules engine and AI (src/engine) and reports
 * how long they last, how they end, and how long it takes the armies to make
 * contact. Board size is a compile-time constant in src/engine/rules.ts, so
 * each size gets its own Vite SSR module graph with BOARD_SIZE (and the
 * terrain quota) rewritten on load. The engine source is never modified.
 *
 *   pnpm simulate                                  # defaults below
 *   pnpm simulate --sizes 8,10,12,14,16 --games 40
 *   pnpm simulate --ai veteran --orders 2 --games 10
 *   pnpm simulate --battlefield open --json results.json
 *
 * Options
 *   --sizes        comma list of even board sizes, 8 or more   (default 8,10,12,14,16)
 *   --games        games per size per mode                      (default 24)
 *   --ai           recruit | veteran | warlord, or "a:b" for different sides (default recruit)
 *   --orders       orders per turn, comma list: 1 = Classic, 2 = Command (default 1,2)
 *   --battlefield  random | open                                (default random)
 *   --terrain      scale (keep 12x12 terrain density) | fixed (16 tiles a side) (default scale)
 *   --max-turns    turn cap before a game counts as a timeout   (default 400)
 *   --workers      parallel processes                           (default CPU count - 1)
 *   --seed         base seed                                    (default 1)
 *   --json         also write raw per-game results to this file
 */
import { fork } from "node:child_process";
import { availableParallelism } from "node:os";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createServer } from "vite";
import type { ViteDevServer } from "vite";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLASSIC_SIZE = 12;
const CLASSIC_QUOTA = 16;

interface Job {
  size: number;
  orders: number;
  ai: [string, string];
  battlefield: string;
  terrainMode: string;
  maxTurns: number;
  seed: number;
}

interface GameResult {
  size: number;
  orders: number;
  seed: number;
  winner: number | null;
  reason: string;
  turns: number;
  orderCount: number;
  firstCaptureTurn: number | null;
  captures: number;
  ms: number;
}

// ---------------------------------------------------------------- arguments

const parseArgs = (argv: string[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const [k, inline] = a.slice(2).split("=");
    const next = argv[i + 1];
    const hasValue = inline === undefined && next !== undefined && !next.startsWith("--");
    out[k] = inline ?? (hasValue ? next : "true");
    if (hasValue) i++;
  }
  return out;
};

const terrainQuota = (size: number, mode: string): number =>
  mode === "fixed" ? CLASSIC_QUOTA : Math.round((CLASSIC_QUOTA * size * size) / (CLASSIC_SIZE * CLASSIC_SIZE));

// ---------------------------------------------------------------- engine loading (one graph per size)

const engines = new Map<string, Promise<{ server: ViteDevServer; mods: Record<string, any> }>>();

const loadEngine = (size: number, quota: number) => {
  const key = `${size}:${quota}`;
  if (!engines.has(key)) engines.set(key, bootEngine(size, quota));
  return engines.get(key)!;
};

const bootEngine = async (size: number, quota: number) => {
  const server = await createServer({
    root: ROOT,
    configFile: false,
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [
      {
        name: "trenchess-board-size",
        transform(code: string, id: string) {
          if (!id.replace(/\\/g, "/").endsWith("/src/engine/rules.ts")) return null;
          const patched = code
            .replace(/export const BOARD_SIZE = \d+;/, `export const BOARD_SIZE = ${size};`)
            .replace(/export const TERRAIN_QUOTA = \d+;/, `export const TERRAIN_QUOTA = ${quota};`);
          if (!patched.includes(`BOARD_SIZE = ${size};`)) throw new Error("could not patch BOARD_SIZE in rules.ts");
          return patched;
        },
      },
    ],
  });
  const load = (p: string) => server.ssrLoadModule(`/src/engine/${p}.ts`);
  const [game, setup, ai, rules, moves] = await Promise.all(["game", "setup", "ai", "rules", "moves"].map(load));
  return { server, mods: { game, setup, ai, rules, moves } };
};

// ---------------------------------------------------------------- one game

/** Classic formation scaled to the board: armies centred, up to two empty rows behind each back rank. */
const formation = (size: number, ARMY: string[]) => {
  const gap = Math.min(2, Math.floor((size - 8) / 2));
  const col0 = Math.floor((size - 8) / 2);
  const rows = [
    { owner: 0, back: size - 1 - gap, front: size - 2 - gap },
    { owner: 1, back: gap, front: gap + 1 },
  ];
  return rows.flatMap(({ owner, back, front }) =>
    ARMY.flatMap((type, i) => [
      { owner, type, pos: [back, col0 + i] },
      { owner, type: "pawn", pos: [front, col0 + i] },
    ]),
  );
};

const buildBattlefield = (m: Record<string, any>, job: Job) => {
  const { emptyGrid } = m.game;
  const board = emptyGrid(null);
  let id = 1;
  for (const { owner, type, pos } of formation(job.size, m.rules.ARMY)) board[pos[0]][pos[1]] = { id: id++, type, owner };
  const terrain = emptyGrid("flat");
  if (job.battlefield === "random") {
    const rng = m.setup.seededRng(job.seed);
    m.setup.randomTerrainFor(board, terrain, 0, rng);
    m.setup.mirrorTerrain(terrain, 0);
  }
  return { board, terrain };
};

const playGame = async (job: Job): Promise<GameResult> => {
  const { mods: m } = await loadEngine(job.size, terrainQuota(job.size, job.terrainMode));
  const started = performance.now();
  const { board, terrain } = buildBattlefield(m, job);
  const s = m.game.createGame(board, terrain, { ordersPerTurn: job.orders });
  const rng = m.setup.seededRng(job.seed * 7919 + 17);
  let orderCount = 0;
  let firstCaptureTurn: number | null = null;
  const totalUnits = () => {
    let n = 0;
    m.moves.forEachUnit(s.board, () => n++);
    return n;
  };
  const startUnits = totalUnits();
  let lastTurn = 0;
  const bareKings = () => {
    let others = 0;
    m.moves.forEachUnit(s.board, (u: { type: string }) => {
      if (u.type !== "king") others++;
    });
    return others === 0;
  };
  let drawn = false;
  while (!s.outcome && s.turn <= job.maxTurns) {
    if (bareKings()) {
      drawn = true;
      break;
    }
    const before = s.fallen[0].length + s.fallen[1].length;
    const order = m.ai.chooseOrder(s, job.ai[s.current], rng);
    const turn = s.turn;
    lastTurn = turn;
    if (order) {
      m.game.applyOrder(s, order);
      orderCount++;
    } else m.game.endTurn(s);
    const after = s.fallen[0].length + s.fallen[1].length;
    if (firstCaptureTurn === null && after > before) firstCaptureTurn = turn;
  }
  return {
    size: job.size,
    orders: job.orders,
    seed: job.seed,
    winner: s.outcome ? s.outcome.winner : null,
    reason: s.outcome ? s.outcome.reason : drawn ? "bare-kings" : "timeout",
    turns: lastTurn,
    orderCount,
    firstCaptureTurn,
    captures: startUnits - totalUnits(),
    ms: Math.round(performance.now() - started),
  };
};

// ---------------------------------------------------------------- worker process

const runWorker = () => {
  process.on("message", async (job: Job | "exit") => {
    if (job === "exit") {
      for (const e of engines.values()) await (await e).server.close();
      process.exit(0);
    }
    try {
      process.send!({ ok: true, result: await playGame(job) });
    } catch (err) {
      process.send!({ ok: false, error: String((err as Error)?.stack ?? err), job });
    }
  });
  process.send!({ ready: true });
};

// ---------------------------------------------------------------- stats + report

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "-");
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const quantile = (xs: number[], q: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const fmt = (x: number) => (Number.isNaN(x) ? "-" : x.toFixed(x >= 100 ? 0 : 1));

const DECISIVE = new Set(["checkmate", "king-captured", "desert"]);

const histogram = (xs: number[], width = 40) => {
  if (!xs.length) return "    (no decisive games)";
  const bucket = Math.max(10, Math.ceil((Math.max(...xs) + 1) / 12 / 10) * 10);
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(Math.floor(x / bucket), (counts.get(Math.floor(x / bucket)) ?? 0) + 1);
  const peak = Math.max(...counts.values());
  const keys = [...counts.keys()].sort((a, b) => a - b);
  const lines: string[] = [];
  for (let k = keys[0]; k <= keys[keys.length - 1]; k++) {
    const n = counts.get(k) ?? 0;
    const label = `${k * bucket}-${(k + 1) * bucket - 1}`.padStart(9);
    lines.push(`    ${label} | ${"#".repeat(Math.round((n / peak) * width))} ${n || ""}`);
  }
  return lines.join("\n");
};

const report = (results: GameResult[], cfg: Record<string, unknown>) => {
  const out: string[] = [];
  out.push("");
  out.push("TRENCHESS SIMULATION");
  out.push(Object.entries(cfg).map(([k, v]) => `${k}=${v}`).join("  "));
  out.push("Turns are counted per player turn (one side's command phase); a 'full move' is two turns.");
  out.push("");
  const header =
    "size orders games | decisive mate  kingcap desert stalem barekg timeout | full moves to win: mean  median  p10  p90 | first capture (full moves) | captures/game | ms/game";
  out.push(header);
  out.push("-".repeat(header.length));
  const groups = new Map<string, GameResult[]>();
  for (const r of results) {
    const k = `${r.size}|${r.orders}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  const keys = [...groups.keys()].sort((a, b) => {
    const [sa, oa] = a.split("|").map(Number);
    const [sb, ob] = b.split("|").map(Number);
    return oa - ob || sa - sb;
  });
  for (const k of keys) {
    const g = groups.get(k)!;
    const by = (reason: string) => g.filter((r) => r.reason === reason).length;
    const won = g.filter((r) => DECISIVE.has(r.reason));
    const fm = won.map((r) => r.turns / 2);
    const fc = g.filter((r) => r.firstCaptureTurn !== null).map((r) => r.firstCaptureTurn! / 2);
    out.push(
      [
        `${g[0].size}x${g[0].size}`.padEnd(5),
        String(g[0].orders).padStart(6),
        String(g.length).padStart(5),
        "|",
        pct(won.length, g.length).padStart(8),
        pct(by("checkmate"), g.length).padStart(5),
        pct(by("king-captured"), g.length).padStart(7),
        pct(by("desert"), g.length).padStart(6),
        pct(by("stalemate"), g.length).padStart(6),
        pct(by("bare-kings"), g.length).padStart(6),
        pct(by("timeout"), g.length).padStart(7),
        "|",
        fmt(mean(fm)).padStart(23),
        fmt(quantile(fm, 0.5)).padStart(7),
        fmt(quantile(fm, 0.1)).padStart(4),
        fmt(quantile(fm, 0.9)).padStart(4),
        "|",
        `${fmt(mean(fc))} avg, ${fmt(quantile(fc, 0.5))} med`.padStart(26),
        "|",
        fmt(mean(g.map((r) => r.captures))).padStart(13),
        "|",
        fmt(mean(g.map((r) => r.ms))).padStart(7),
      ].join(" "),
    );
  }
  out.push("");
  for (const k of keys) {
    const g = groups.get(k)!;
    const won = g.filter((r) => DECISIVE.has(r.reason));
    const p0 = won.filter((r) => r.winner === 0).length;
    out.push(
      `${g[0].size}x${g[0].size}, ${g[0].orders} order(s)/turn: full moves to a decisive result (Azure won ${p0}, Crimson won ${won.length - p0})`,
    );
    out.push(histogram(won.map((r) => r.turns / 2)));
    out.push("");
  }
  return out.join("\n");
};

// ---------------------------------------------------------------- coordinator

const runMain = async () => {
  const args = parseArgs(process.argv.slice(2));
  const sizes = (args.sizes ?? "8,10,12,14,16").split(",").map(Number);
  for (const n of sizes) if (!(n >= 8 && n % 2 === 0)) throw new Error(`board size ${n} must be even and at least 8`);
  const ordersList = (args.orders ?? "1,2").split(",").map(Number);
  const games = Number(args.games ?? 24);
  const [aiA, aiB = aiA] = (args.ai ?? "recruit").split(":");
  const battlefield = args.battlefield ?? "random";
  const terrainMode = args.terrain ?? "scale";
  const maxTurns = Number(args["max-turns"] ?? 400);
  const seed = Number(args.seed ?? 1);
  const workers = Math.max(1, Number(args.workers ?? Math.max(1, availableParallelism() - 1)));

  const jobs: Job[] = [];
  for (let g = 0; g < games; g++) {
    for (const orders of ordersList) {
      for (const size of sizes) {
        // Same seed across sizes and modes so comparisons share terrain RNG streams; alternate who is Azure.
        const ai: [string, string] = g % 2 === 0 ? [aiA, aiB] : [aiB, aiA];
        jobs.push({ size, orders, ai, battlefield, terrainMode, maxTurns, seed: seed * 100003 + g });
      }
    }
  }

  const cfg = { sizes: sizes.join(","), orders: ordersList.join(","), games, ai: `${aiA}:${aiB}`, battlefield, terrain: terrainMode, maxTurns, seed };
  console.error(`Running ${jobs.length} games on ${workers} worker(s)...`);
  const results: GameResult[] = [];
  const started = Date.now();
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(workers, jobs.length) }, () =>
      new Promise<void>((done, fail) => {
        const child = fork(fileURLToPath(import.meta.url), ["--worker"], { execArgv: process.execArgv });
        const dispatch = () => {
          if (next >= jobs.length) {
            child.send("exit");
            return;
          }
          child.send(jobs[next++]);
        };
        child.on("message", (msg: any) => {
          if (msg.ready) return dispatch();
          if (!msg.ok) return fail(new Error(msg.error));
          results.push(msg.result);
          const r = msg.result as GameResult;
          const secs = ((Date.now() - started) / 1000).toFixed(0);
          console.error(`  [${results.length}/${jobs.length}] ${secs}s  ${r.size}x${r.size} o${r.orders} -> ${r.reason} in ${r.turns} turns`);
          dispatch();
        });
        child.on("exit", () => done());
        child.on("error", fail);
      }),
    ),
  );

  console.log(report(results, cfg));
  if (args.json) {
    writeFileSync(args.json, JSON.stringify({ config: cfg, results }, null, 2));
    console.error(`Raw results written to ${args.json}`);
  }
};

if (process.argv.includes("--worker")) runWorker();
else
  runMain().catch((err) => {
    console.error(err);
    process.exit(1);
  });
