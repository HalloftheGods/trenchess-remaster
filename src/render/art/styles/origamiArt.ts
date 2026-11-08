import type { UnitType } from "../../../engine/types";
import type { Faction } from "../unitArt";
import { X, crease, diamond, facet, mat, paper, ridge, strip, type G, type Paper } from "./origamiParts";

/** Tall body: two main faces on a centre ridge with slimmer outer flaps. */
const body = (g: G, p: Paper, top: number, topHalf: number, foot: number, footHalf: number, flap = 0): void => {
  if (flap > 0) {
    facet(g, p, "mid", [X - footHalf, foot, X - topHalf, top + (foot - top) * 0.3, X - footHalf - flap, foot]);
    facet(g, p, "deep", [X + footHalf, foot, X + topHalf, top + (foot - top) * 0.3, X + footHalf + flap, foot]);
  }
  ridge(g, p, [X - footHalf, foot, X - topHalf, top, X, top, X, foot], [X, top, X + topHalf, top, X + footHalf, foot, X, foot]);
};

const pawn = (g: G, f: Faction): void => {
  const p = paper(f);
  mat(g, p);
  body(g, p, 50, 1, 82, 12);
  crease(g, p, X - 6, 66, X, 56, true);
  crease(g, p, X + 6, 66, X, 56, false);
  diamond(g, p, X, 47, 8, 8, ["mid", "deep"]);
  diamond(g, p, X, 32, 8, 19);
  crease(g, p, X - 4, 40, X, 51, true);
  crease(g, p, X + 4, 40, X, 51, false);
};

const knight = (g: G, f: Faction): void => {
  const p = paper(f);
  mat(g, p);
  strip(g, p, "deep", X - 10, 68, X - 14, 86, 3.5);
  strip(g, p, "deep", X + 10, 66, X + 14, 86, 3.5);
  facet(g, p, "shade", [X - 18, 60, X - 26, 50, X - 27, 62, X - 22, 72]);
  crease(g, p, X - 22, 72, X - 24, 56, false);
  ridge(g, p, [X - 18, 58, X + 12, 54, X + 10, 64, X - 16, 68], [X - 16, 68, X + 10, 64, X + 12, 72, X - 14, 76], ["lit", "shade"]);
  crease(g, p, X - 6, 59, X - 8, 73, true);
  strip(g, p, "lit", X - 6, 72, X - 8, 86, 3.5);
  strip(g, p, "lit", X + 4, 70, X + 6, 86, 3.5);
  ridge(g, p, [X + 4, 56, X + 14, 28, X + 20, 30, X + 14, 58], [X + 14, 28, X + 22, 24, X + 25, 32, X + 20, 30]);
  crease(g, p, X + 9, 52, X + 16, 34, true);
  ridge(g, p, [X + 14, 28, X + 22, 24, X + 24, 34, X + 18, 36], [X + 22, 24, X + 32, 36, X + 30, 42, X + 24, 40, X + 24, 34], ["lit", "mid"]);
  facet(g, p, "deep", [X + 24, 40, X + 30, 42, X + 28, 46, X + 22, 44]);
  facet(g, p, "lit", [X + 18, 26, X + 21, 14, X + 24, 24]);
  facet(g, p, "shade", [X + 13, 28, X + 15, 18, X + 19, 26]);
  g.fillStyle = "rgba(0,0,0,0.75)";
  g.beginPath();
  g.moveTo(X + 23, 30);
  g.lineTo(X + 27, 32.5);
  g.lineTo(X + 23, 34);
  g.closePath();
  g.fill();
};

const bishop = (g: G, f: Faction): void => {
  const p = paper(f);
  mat(g, p);
  body(g, p, 44, 5, 82, 14, 3);
  crease(g, p, X - 10, 70, X - 2, 50, true);
  crease(g, p, X + 10, 70, X + 2, 50, false);
  diamond(g, p, X, 41, 9, 8, ["mid", "deep"]);
  ridge(g, p, [X, 14, X - 9, 32, X - 6, 46, X, 46], [X, 14, X + 9, 32, X + 6, 46, X, 46]);
  crease(g, p, X - 2, 20, X - 6, 40, true);
  crease(g, p, X + 2, 20, X + 6, 40, false);
  facet(g, p, "deep", [X - 2, 14, X + 2, 14, X, 24]);
  facet(g, p, "lit", [X - 2, 40, X + 2, 38, X + 2, 46, X - 2, 46]);
};

const rook = (g: G, f: Faction): void => {
  const p = paper(f);
  mat(g, p);
  const tab = (x0: number, y0: number, x1: number, y1: number, tone: "lit" | "shade" | "mid" | "deep"): void => {
    facet(g, p, tone, [x0, y0, x0, y0 - 7, x1, y1 - 7, x1, y1]);
  };
  tab(X - 13, 37, X - 8, 35, "mid");
  tab(X - 4, 33.5, X + 1, 33, "mid");
  tab(X + 5, 34, X + 10, 36, "deep");
  ridge(g, p, [X - 16, 80, X - 16, 38, X, 44, X, 86], [X, 44, X + 16, 38, X + 16, 80, X, 86]);
  for (const y of [52, 66]) {
    crease(g, p, X - 16, y - 6, X, y, true);
    crease(g, p, X, y, X + 16, y - 6, false);
  }
  facet(g, p, "lit", [X - 16, 38, X, 32, X + 16, 38, X, 44]);
  tab(X - 14, 38.75, X - 9, 40.6, "lit");
  tab(X - 5, 42.1, X, 44, "lit");
  tab(X + 3, 42.9, X + 8, 41, "shade");
  tab(X + 11, 39.9, X + 15, 38.4, "shade");
  facet(g, p, "deep", [X - 12, 78, X - 8, 62, X - 4, 80]);
  crease(g, p, X - 8, 62, X - 8, 79, false);
};

const queen = (g: G, f: Faction): void => {
  const p = paper(f);
  mat(g, p);
  body(g, p, 46, 6, 82, 15, 4);
  crease(g, p, X - 11, 76, X - 3, 52, true);
  crease(g, p, X + 11, 76, X + 3, 52, false);
  facet(g, p, "mid", [X - 7, 48, X, 44, X + 7, 48, X, 52]);
  g.strokeStyle = f.trim;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(X - 7, 48);
  g.lineTo(X, 52);
  g.lineTo(X + 7, 48);
  g.stroke();
  ridge(g, p, [X - 5, 46, X - 3, 34, X, 34, X, 46], [X, 34, X + 3, 34, X + 5, 46, X, 46]);
  diamond(g, p, X, 24, 5.5, 12);
  facet(g, p, "shade", [X - 7, 30, X - 17, 20, X - 4, 27]);
  facet(g, p, "deep", [X + 4, 27, X + 17, 20, X + 7, 30]);
  facet(g, p, "lit", [X - 5, 28, X - 11, 13, X - 1, 26]);
  facet(g, p, "shade", [X + 1, 26, X + 11, 13, X + 5, 28]);
  ridge(g, p, [X - 2, 27, X, 8, X, 27], [X, 8, X + 2, 27, X, 27]);
};

const king = (g: G, f: Faction): void => {
  const p = paper(f);
  mat(g, p);
  body(g, p, 46, 8, 82, 16, 4);
  crease(g, p, X - 12, 78, X - 4, 52, true);
  crease(g, p, X + 12, 78, X + 4, 52, false);
  ridge(g, p, [X - 14, 46, X, 39, X, 53, X - 7, 50], [X, 39, X + 14, 46, X + 7, 50, X, 53], ["mid", "deep"]);
  facet(g, p, "lit", [X - 14, 46, X, 39, X + 14, 46, X, 44]);
  g.strokeStyle = f.trim;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(X - 13, 47);
  g.lineTo(X, 53);
  g.lineTo(X + 13, 47);
  g.stroke();
  ridge(g, p, [X - 5, 42, X - 3, 30, X, 30, X, 42], [X, 30, X + 3, 30, X + 5, 42, X, 42]);
  diamond(g, p, X, 20, 6, 13);
  ridge(g, p, [X - 2, 7, X, 7, X, 24, X - 2, 24], [X, 7, X + 2, 7, X + 2, 24, X, 24]);
  ridge(g, p, [X - 8, 12, X, 12, X, 16, X - 8, 16], [X, 12, X + 8, 12, X + 8, 16, X, 16]);
};

export const ORIGAMI: Record<UnitType, (g: G, f: Faction) => void> = { pawn, knight, bishop, rook, queen, king };
