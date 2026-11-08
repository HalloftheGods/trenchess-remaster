import { describe, expect, it } from "vitest";
import { TERRAINS } from "./recipe";
import { WORLD_LABELS, WORLD_ORDER, WORLD_TAGLINES, applyWorld, isWorldId, recipe, world } from "./registry";

describe("world registry", () => {
  it("defaults to the classic look", () => {
    expect(world.id).toBe("classic");
    expect(WORLD_ORDER[0]).toBe("classic");
  });

  it("has a label and tagline for every world", () => {
    for (const id of WORLD_ORDER) {
      expect(WORLD_LABELS[id].length).toBeGreaterThan(0);
      expect(WORLD_TAGLINES[id].length).toBeGreaterThan(0);
    }
  });

  it("gives every world a complete recipe for every terrain", () => {
    for (const id of WORLD_ORDER) {
      applyWorld(id);
      const w = recipe();
      for (const t of TERRAINS) {
        expect(w.tiles[t].top).toMatch(/^#/);
        expect(w.tops[t].light).toMatch(/^#/);
        expect(typeof w.surface[t]).toBe("function");
        expect(typeof w.topDetail[t]).toBe("function");
      }
      expect(w.sky.stops.length).toBeGreaterThan(2);
      expect(w.sky.peaks).toHaveLength(4);
    }
    applyWorld("classic");
  });

  it("recognises only known ids", () => {
    expect(isWorldId("neon")).toBe(true);
    expect(isWorldId("mars")).toBe(false);
    expect(isWorldId(null)).toBe(false);
  });

  it("switches the active world without throwing when storage is unavailable", () => {
    applyWorld("tundra");
    expect(world.id).toBe("tundra");
    applyWorld("classic");
    expect(world.id).toBe("classic");
  });
});
