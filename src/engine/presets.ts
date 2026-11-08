import type { Pos, Terrain } from "./types";
import { BOARD_SIZE } from "./rules";
import { emptyGrid } from "./game";
import { mirrorPos } from "./setup";

export interface Preset {
  id: string;
  name: string;
  tagline: string;
  terrain: Terrain[][];
}

/** One brush stroke of a preset: a terrain type over a set of cells (mirrored automatically). */
interface Stroke {
  t: Terrain;
  cells: Pos[];
}

const MID = (BOARD_SIZE - 1) / 2;

/** Formation squares (rows 2, 3, 8, 9 x cols 2-9) must stay flat so the classic armies always fit. */
export const isFormationSquare = ([r, c]: Pos): boolean =>
  (r === 2 || r === 3 || r === 8 || r === 9) && c >= 2 && c <= 9;

export const rect = (r0: number, r1: number, c0: number, c1: number): Pos[] => {
  const out: Pos[] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push([r, c]);
  return out;
};

export const band = (r0: number, r1: number): Pos[] => rect(r0, r1, 0, BOARD_SIZE - 1);

export const row = (r: number, cols: number[]): Pos[] => cols.map((c) => [r, c] as Pos);

/** The hollow border of a rectangle. */
export const ring = (r0: number, r1: number, c0: number, c1: number): Pos[] =>
  rect(r0, r1, c0, c1).filter(([r, c]) => r === r0 || r === r1 || c === c0 || c === c1);

/** Filled ellipse around a (possibly half-integer) center. */
export const lake = (cr: number, cc: number, ry: number, rx: number): Pos[] =>
  band(0, BOARD_SIZE - 1).filter(([r, c]) => ((r - cr) / ry) ** 2 + ((c - cc) / rx) ** 2 <= 1);

/** Filled diamond (Manhattan ball) around the board center. */
export const diamond = (radius: number): Pos[] =>
  band(0, BOARD_SIZE - 1).filter(([r, c]) => Math.abs(r - MID) + Math.abs(c - MID) <= radius);

/** Cells on a diagonal (c - r = offset) or anti-diagonal (c + r = 11 + offset) within a row span. */
export const diagonal = (offset: number, anti: boolean, r0 = 0, r1 = BOARD_SIZE - 1): Pos[] =>
  rect(r0, r1, 0, BOARD_SIZE - 1).filter(([r, c]) => (anti ? c + r - (BOARD_SIZE - 1) : c - r) === offset);

const key = ([r, c]: Pos): string => `${r},${c}`;

export const without = (cells: Pos[], holes: Pos[]): Pos[] => {
  const drop = new Set(holes.map(key));
  return cells.filter((p) => !drop.has(key(p)));
};

const stroke = (t: Terrain, ...parts: Pos[][]): Stroke => ({ t, cells: parts.flat() });

/** Paint strokes in order (later strokes win), mirroring every cell through the center. */
export const paintPreset = (strokes: Stroke[]): Terrain[][] => {
  const grid = emptyGrid<Terrain>("flat");
  for (const { t, cells } of strokes) {
    for (const p of cells) {
      if (isFormationSquare(p)) continue;
      const [mr, mc] = mirrorPos(p);
      grid[p[0]][p[1]] = t;
      grid[mr][mc] = t;
    }
  }
  return grid;
};

const preset = (id: string, name: string, tagline: string, strokes: Stroke[]): Preset => ({
  id,
  name,
  tagline,
  terrain: paintPreset(strokes),
});

export const PRESETS: Preset[] = [
  preset("serpent-river", "Serpent River", "A swamp river winds across the field; two fords stay dry.", [
    stroke("swamp", row(3, [0, 1]), row(4, [0, 1, 2, 3, 5, 6]), row(5, [2, 3, 5, 6])),
    stroke("forest", row(5, [0, 1, 8, 9])),
  ]),
  preset("iron-peaks", "Iron Peaks", "Twin mountain ridges with narrow passes and a central massif.", [
    stroke("mountain", without(band(4, 4), row(4, [3, 8])), row(5, [5, 6])),
  ]),
  preset("whispering-woods", "Whispering Woods", "Belts of forest with clearings for the cavalry.", [
    stroke("forest", without(band(4, 4), row(4, [5, 6])), row(5, [1, 2, 3, 8, 9, 10]), row(1, [0, 11]), row(2, [0, 11])),
  ]),
  preset("endless-sands", "Endless Sands", "A deadly desert crossed only by three causeways.", [
    stroke("desert", rect(4, 5, 1, 4), rect(4, 5, 7, 10)),
    stroke("swamp", row(5, [2])),
  ]),
  preset("four-corners", "Four Corners", "Woods face peaks across the diagonals.", [
    stroke("forest", rect(4, 5, 1, 4), row(0, [0, 1]), row(1, [0])),
    stroke("mountain", rect(4, 5, 7, 10), row(0, [10, 11]), row(1, [11])),
  ]),
  preset("the-crucible", "The Crucible", "A ring of every terrain around a flat arena.", [
    stroke("mountain", row(4, [2, 3, 8, 9])),
    stroke("forest", row(4, [4, 5]), row(5, [2])),
    stroke("swamp", row(4, [6, 7]), row(6, [2])),
    stroke("desert", row(4, [1, 10])),
  ]),
  preset("twin-lakes", "Twin Lakes", "Two swamp lakes with a narrow isthmus between them.", [
    stroke("swamp", lake(4.5, 3, 1.6, 2.6)),
    stroke("forest", row(6, [2, 4])),
  ]),
  preset("crossroads", "Crossroads", "Two flat roads cross between woods and marsh.", [
    stroke("forest", row(4, [0, 1, 2, 3, 4]), row(3, [0, 1]), row(2, [0, 1])),
    stroke("swamp", row(4, [7, 8, 9, 10, 11]), row(3, [10, 11]), row(2, [10, 11])),
  ]),
  preset("scorched-earth", "Scorched Earth", "A burnt massif amid patches of killing sand.", [
    stroke("mountain", diamond(2.5)),
    stroke("desert", row(4, [1, 2, 9, 10]), row(5, [1, 10])),
  ]),
  preset("archipelago", "Archipelago", "A swamp sea dotted with flat islands and a lone crag.", [
    stroke("swamp", without(band(4, 7), [rect(4, 5, 1, 2), rect(4, 5, 9, 10), rect(5, 6, 5, 6), rect(6, 7, 1, 2), rect(6, 7, 9, 10)].flat())),
    stroke("mountain", row(4, [7])),
  ]),
  preset("the-trench", "The Trench", "A dug line of mixed ground, breached at two points.", [
    stroke("mountain", row(5, [0, 1, 11])),
    stroke("forest", row(5, [2, 10]), row(4, [0, 11])),
    stroke("swamp", row(5, [4, 5, 8])),
    stroke("desert", row(5, [6, 7])),
  ]),
  preset("sunken-realm", "Sunken Realm", "A drowned basin walled by highland peaks.", [
    stroke("swamp", diamond(2.5)),
    stroke("mountain", row(4, [0, 1, 10, 11]), row(5, [0, 11])),
    stroke("forest", row(4, [3, 8]), row(5, [2, 9])),
  ]),
];

export const presetById = (id: string): Preset => PRESETS.find((p) => p.id === id) ?? PRESETS[0];
