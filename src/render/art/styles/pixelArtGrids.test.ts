import { describe, expect, it } from "vitest";
import { PIXEL_GRIDS, PIXEL_H, PIXEL_W } from "./pixelArtGrids";

const LEGEND = new Set(".ohbldtswmkz".split(""));

describe("pixel chessmen grids", () => {
  for (const [type, grid] of Object.entries(PIXEL_GRIDS)) {
    it(`${type} is ${PIXEL_W}x${PIXEL_H} and uses only legend characters`, () => {
      expect(grid).toHaveLength(PIXEL_H);
      grid.forEach((row, y) => {
        expect(row, `${type} row ${y}`).toHaveLength(PIXEL_W);
        for (const ch of row) expect(LEGEND.has(ch), `${type} row ${y} char "${ch}"`).toBe(true);
      });
    });

    it(`${type} keeps the spec silhouette: top below y=6, foot shadow around y=86-92`, () => {
      const inked = grid.map((row, y) => [y, /[^.]/.test(row)] as const).filter(([, on]) => on).map(([y]) => y);
      expect(Math.min(...inked) * 4).toBeGreaterThanOrEqual(6);
      const shadowRows = grid.map((row, y) => [y, row.includes("z")] as const).filter(([, on]) => on).map(([y]) => y);
      expect(Math.min(...shadowRows) * 4).toBeGreaterThanOrEqual(84);
      expect((Math.max(...shadowRows) + 1) * 4).toBeLessThanOrEqual(96);
    });
  }
});
