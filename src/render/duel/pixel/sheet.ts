import type { Palette } from "./palette";

/**
 * Every frame a chessman's duel sprite sheet provides. All face RIGHT (the game mirrors them).
 *
 *   idle0, idle1        breathing loop (idle1 = chest/shoulders 1px lower or weapon bob)
 *   walk0..walk3        run cycle on foot; for riders, the four-beat gallop of the steed
 *   guard               bracing for a blow, weapon/shield raised in front
 *   windup              weapon drawn back/overhead, about to strike
 *   attack0             mid-swing (a smear frame: blade drawn as a streak is welcome)
 *   attack1             follow-through / full extension (thrusters: the weapon fully forward)
 *   hit                 recoiling from a blow, head back, off balance
 *   crouch              coiled before a leap
 *   air                 airborne (leap, mid-jump)
 *   victory0, victory1  triumphant pose; victory1 is the same pose with a glint on the weapon
 *   special             the ability's own pose (see the brief for each chessman)
 */
export const FRAME_IDS = ["idle0", "idle1", "walk0", "walk1", "walk2", "walk3", "guard", "windup", "attack0", "attack1", "hit", "crouch", "air", "victory0", "victory1", "special"] as const;
export type FrameId = (typeof FRAME_IDS)[number];

export type Grid = string[];

export interface SpriteSheet {
  /** Frame size in pixels; every frame of the sheet has exactly this size. */
  w: number;
  h: number;
  /** The pixel between the feet (or hooves) that stands on the floor, in frame coordinates. */
  foot: [number, number];
  frames: Record<FrameId, Grid>;
  /** Where the weapon's business end is in a frame, for sparks and slashes. */
  tips?: Partial<Record<FrameId, [number, number]>>;
  /** Per-sheet colour overrides (steed coat, hair). */
  palette?: Palette;
}

/** Draws one grid at 1:1 onto `g` at (ox, oy). Unknown characters are skipped. */
export const drawGrid = (g: CanvasRenderingContext2D, grid: Grid, palette: Palette, ox = 0, oy = 0): void => {
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color || row[x] === ".") continue;
      g.fillStyle = color;
      g.fillRect(ox + x, oy + y, 1, 1);
    }
  });
};

/** Pads or crops every row to `w` and the grid to `h` rows (helps hand-written grids stay exact). */
export const fit = (grid: Grid, w: number, h: number): Grid => {
  const rows = grid.slice(0, h).map((r) => r.padEnd(w, ".").slice(0, w));
  while (rows.length < h) rows.unshift(".".repeat(w));
  return rows;
};

/** Composes part grids onto a blank w x h frame: later parts draw over earlier ones ('.' is clear). */
export const compose = (w: number, h: number, parts: [Grid, number, number][]): Grid => {
  const out = Array.from({ length: h }, () => Array.from({ length: w }, () => "."));
  for (const [grid, ox, oy] of parts) {
    grid.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        const tx = x + ox;
        const ty = y + oy;
        if (ch === "." || tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
        out[ty][tx] = ch;
      }
    });
  }
  return out.map((r) => r.join(""));
};

/** Mirrors a grid left-to-right. */
export const flip = (grid: Grid): Grid => grid.map((r) => r.split("").reverse().join(""));

/** Shifts a grid by (dx, dy) inside its own bounds. */
export const shift = (grid: Grid, dx: number, dy: number): Grid => compose(grid[0]?.length ?? 0, grid.length, [[grid, dx, dy]]);

/**
 * Adds a 1px outline ('o') around every inked pixel that touches transparency, outside the
 * shape. Handy when parts are composed without their own outline.
 */
export const outline = (grid: Grid, ink = "o"): Grid => {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const at = (x: number, y: number): string => (x < 0 || y < 0 || x >= w || y >= h ? "." : grid[y][x]);
  return grid.map((row, y) =>
    row
      .split("")
      .map((ch, x) => {
        if (ch !== ".") return ch;
        const near = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some((c) => c !== "." && c !== ink && c !== "z");
        return near ? ink : ".";
      })
      .join(""),
  );
};
