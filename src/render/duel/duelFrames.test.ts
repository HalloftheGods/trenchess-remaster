import { describe, expect, it } from "vitest";
import { PIXEL_GRIDS, PIXEL_H } from "../art/styles/pixelArtGrids";
import { DUEL_FRAMES, DUEL_H, DUEL_W, frameGrid, hitPalette } from "./duelFrames";

const inked = (grid: string[]): number => grid.join("").replace(/\./g, "").length;

const leftmost = (grid: string[]): number => Math.min(...grid.map((row) => row.search(/[^.]/)).filter((x) => x >= 0));

describe("duel sprite frames", () => {
  for (const [type, grid] of Object.entries(PIXEL_GRIDS)) {
    it(`${type}: every frame is ${DUEL_W}x${DUEL_H}, keeps every pixel and stands on the floor`, () => {
      for (const frame of DUEL_FRAMES) {
        const out = frameGrid(grid, frame);
        expect(out).toHaveLength(DUEL_H);
        out.forEach((row) => expect(row).toHaveLength(DUEL_W));
        expect(inked(out), `${type} ${frame}`).toBe(inked(grid));
        expect(out[DUEL_H - 1]).toBe(grid[PIXEL_H - 1].padStart(24, ".").padEnd(DUEL_W, "."));
      }
    });

    it(`${type}: the lunge frames step forward and lean further than idle`, () => {
      const idle = leftmost(frameGrid(grid, "idle"));
      const one = leftmost(frameGrid(grid, "lunge1"));
      const two = leftmost(frameGrid(grid, "lunge2"));
      expect(one).toBeGreaterThan(idle);
      expect(two).toBeGreaterThan(one);
    });
  }

  it("the hit palette whitens everything but the ground shadow", () => {
    const p = hitPalette({ o: "#000", b: "#123", z: "rgba(0,0,0,0.4)" });
    expect(p).toEqual({ o: "#ffffff", b: "#ffffff", z: "rgba(0,0,0,0.4)" });
  });
});
