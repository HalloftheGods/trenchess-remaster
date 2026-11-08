import { describe, expect, it } from "vitest";
import type { PlayerId, Pos, Terrain } from "./types";
import { PRESETS, isFormationSquare, presetById } from "./presets";
import { createGame, legalOrders } from "./game";
import { createArmies, mirrorPos } from "./setup";
import { BOARD_SIZE } from "./rules";

const ALL_TERRAIN: Terrain[] = ["flat", "forest", "swamp", "mountain", "desert"];

const cells = (): Pos[] => {
  const out: Pos[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) out.push([r, c]);
  return out;
};

const nonFlatOnSide = (terrain: Terrain[][], player: PlayerId): number => {
  const rows = player === 0 ? [6, 11] : [0, 5];
  let n = 0;
  for (let r = rows[0]; r <= rows[1]; r++) n += terrain[r].filter((t) => t !== "flat").length;
  return n;
};

const openingOrders = (terrain: Terrain[][], player: PlayerId): number => {
  const s = createGame(createArmies(), terrain, { ordersPerTurn: 2 });
  s.current = player;
  return legalOrders(s).length;
};

describe("Chi presets", () => {
  it("ships twelve presets with unique ids and names", () => {
    expect(PRESETS).toHaveLength(12);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(12);
    expect(new Set(PRESETS.map((p) => p.name)).size).toBe(12);
    for (const p of PRESETS) {
      expect(p.id).toMatch(/^[a-z-]+$/);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.tagline.length).toBeGreaterThan(0);
    }
  });

  it("uses every terrain type across the set", () => {
    const used = new Set<Terrain>(PRESETS.flatMap((p) => p.terrain.flat()));
    for (const t of ALL_TERRAIN) expect(used.has(t)).toBe(true);
  });

  describe.each(PRESETS.map((p) => [p.name, p] as const))("%s", (_name, p) => {
    it("is a 12x12 grid of terrain", () => {
      expect(p.terrain).toHaveLength(BOARD_SIZE);
      for (const row of p.terrain) {
        expect(row).toHaveLength(BOARD_SIZE);
        for (const t of row) expect(ALL_TERRAIN).toContain(t);
      }
    });

    it("is point-symmetric through the center", () => {
      for (const pos of cells()) {
        const [mr, mc] = mirrorPos(pos);
        expect(p.terrain[pos[0]][pos[1]]).toBe(p.terrain[mr][mc]);
      }
    });

    it("keeps the formation squares flat", () => {
      for (const pos of cells().filter(isFormationSquare)) expect(p.terrain[pos[0]][pos[1]]).toBe("flat");
    });

    it("has a readable amount of terrain on each side", () => {
      for (const player of [0, 1] as PlayerId[]) {
        const n = nonFlatOnSide(p.terrain, player);
        expect(n).toBeGreaterThan(0);
        expect(n).toBeLessThanOrEqual(40);
      }
    });

    it("leaves a safe step in every row", () => {
      for (const row of p.terrain) expect(row.some((t) => t !== "desert")).toBe(true);
    });

    it("gives both classic armies legal opening orders", () => {
      expect(openingOrders(p.terrain, 0)).toBeGreaterThan(0);
      expect(openingOrders(p.terrain, 1)).toBeGreaterThan(0);
    });
  });

  it("looks up presets by id and falls back to the first one", () => {
    for (const p of PRESETS) expect(presetById(p.id)).toBe(p);
    expect(presetById("no-such-field")).toBe(PRESETS[0]);
    expect(presetById("")).toBe(PRESETS[0]);
  });
});
