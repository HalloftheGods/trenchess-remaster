import type { Grid } from "./sheet";

/** The duel's bitmap font: 5x7 capitals, digits and punctuation, '#' lit. Placeholder until authored. */
export const FONT_W = 5;
export const FONT_H = 7;

const box: Grid = ["#####", "#...#", "#...#", "#...#", "#...#", "#...#", "#####"];

export const FONT: Record<string, Grid> = {
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  "?": box,
};
