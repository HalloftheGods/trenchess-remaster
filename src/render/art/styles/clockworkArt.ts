import type { UnitType } from "../../../engine/types";
import type { Faction } from "../unitArt";
import { ellipse, radial } from "../canvas";
import { BRASS, COPPER, INK, STEEL, X, alpha, enamel, gauge, gear, lens, line, metal, plate, poly, puff, rect, rivets, spark, type G } from "./clockworkParts";

const gloss = (g: G, x: number, y0: number, y1: number): void => line(g, x, y0, x, y1, "rgba(255,255,255,0.45)", 1.4);

const visor = (g: G, x0: number, x1: number, y: number, f: Faction): void => {
  rect(g, x0, y - 1.5, x1 - x0, 3, "#0a0a0c", 1);
  line(g, x0 + 1, y, x1 - 1, y, f.light, 1.2);
  ellipse(g, (x0 + x1) / 2, y, (x1 - x0) * 0.6, 3, radial(g, (x0 + x1) / 2, y, (x1 - x0) * 0.6, [[0, alpha(f.light, 0.5)], [1, alpha(f.light, 0)]]));
};

const pawn = (g: G, f: Faction): void => {
  plate(g, f);
  for (const side of [-1, 1]) ellipse(g, X + side * 6, 83, 5, 3, metal(g, COPPER, X + side * 6 - 5, X + side * 6 + 5));
  line(g, X + 9, 60, X + 18, 60, BRASS.dark, 3.5);
  line(g, X + 9, 59.5, X + 18, 59.5, BRASS.light, 1);
  for (const ky of [54.5, 65.5]) {
    ellipse(g, X + 19, ky, 3.6, 5.2, INK);
    ellipse(g, X + 19, ky, 2.8, 4.4, metal(g, BRASS, X + 16, X + 22));
    ellipse(g, X + 19, ky, 1.2, 2.4, "rgba(20,12,4,0.85)");
  }
  ellipse(g, X + 19, 60, 2.2, 2.2, metal(g, COPPER, X + 17, X + 21));
  rect(g, X - 10, 50, 20, 32, metal(g, BRASS, X - 10, X + 10), 4);
  rect(g, X - 7, 54, 14, 15, enamel(g, f, X - 7, X + 7), 2);
  gloss(g, X - 5, 56, 66);
  rect(g, X - 10, 70, 20, 3.5, metal(g, COPPER, X - 10, X + 10), 1);
  rivets(g, [X - 7.5, 76, X + 7.5, 76, X - 7.5, 52, X + 7.5, 52]);
  for (const side of [-1, 1]) {
    rect(g, X + side * 12 - 2.5, 53, 5, 16, metal(g, STEEL, X + side * 12 - 3, X + side * 12 + 3), 2);
    ellipse(g, X + side * 12, 71, 3, 3, metal(g, BRASS, X + side * 12 - 3, X + side * 12 + 3));
  }
  ellipse(g, X, 49, 8, 3, BRASS.dark);
  g.beginPath();
  g.arc(X, 46, 9, Math.PI, 0);
  g.closePath();
  g.fillStyle = metal(g, BRASS, X - 9, X + 9);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
  rect(g, X - 9, 45, 18, 5, metal(g, BRASS, X - 9, X + 9), 1);
  visor(g, X - 6, X + 6, 44, f);
  ellipse(g, X, 36.5, 1.6, 1.6, f.base);
  line(g, X, 38, X, 37, BRASS.dark, 1.5);
};

const knight = (g: G, f: Faction): void => {
  plate(g, f);
  for (const [lx, fx] of [[X - 13, X - 16], [X - 6, X - 6], [X + 8, X + 8], [X + 14, X + 17]]) {
    line(g, lx, 68, fx, 84, STEEL.dark, 4);
    line(g, lx, 68, fx, 84, STEEL.base, 2);
    gear(g, (lx + fx) / 2, 76, 3.2, 3.2, 7, BRASS);
    ellipse(g, fx, 85, 3, 1.6, COPPER.dark);
  }
  rect(g, X - 20, 56, 4, 8, metal(g, COPPER, X - 20, X - 16), 1);
  puff(g, X - 20, 50, 3.5);
  puff(g, X - 23, 44, 3, 0.6);
  ellipse(g, X - 2, 66, 18, 9, metal(g, BRASS, X - 20, X + 16));
  poly(g, [X - 14, 58, X + 8, 58, X + 7, 70, X - 13, 70], enamel(g, f, X - 14, X + 8));
  gloss(g, X - 10, 60, 68);
  gear(g, X - 6, 67, 6, 6, 9, COPPER, f.base);
  rivets(g, [X - 17, 66, X + 13, 66, X + 2, 73]);
  line(g, X + 10, 60, X + 21, 44, COPPER.dark, 6);
  line(g, X + 10, 60, X + 21, 44, COPPER.base, 3.5);
  line(g, X + 12, 58, X + 20, 46, COPPER.light, 1);
  poly(g, [X + 16, 46, X + 20, 36, X + 26, 38, X + 32, 46, X + 31, 51, X + 22, 51], metal(g, BRASS, X + 16, X + 32));
  poly(g, [X + 18, 38, X + 20, 31, X + 23, 38], metal(g, BRASS, X + 18, X + 23));
  poly(g, [X + 23, 37, X + 26, 31, X + 27, 38], BRASS.dark);
  line(g, X + 17, 40, X + 13, 52, f.base, 2.5);
  lens(g, X + 24, 43, 2.4);
  line(g, X + 26, 49, X + 30, 49, INK, 1);
  line(g, X - 18, 62, X - 24, 76, f.base, 2);
  line(g, X - 18, 62, X - 24, 76, f.light, 0.6);
};

const bishop = (g: G, f: Faction): void => {
  plate(g, f);
  poly(g, [X - 13, 82, X - 8, 42, X + 8, 42, X + 13, 82], metal(g, BRASS, X - 13, X + 13));
  poly(g, [X - 9, 78, X - 5, 46, X + 5, 46, X + 9, 78], enamel(g, f, X - 9, X + 9));
  gloss(g, X - 5, 50, 74);
  rect(g, X - 11, 60, 22, 3.5, metal(g, COPPER, X - 11, X + 11), 1);
  rivets(g, [X - 11, 78, X + 11, 78, X - 7, 45, X + 7, 45]);
  for (const side of [-1, 1]) {
    line(g, X + side * 10, 50, X + side * 16, 64, STEEL.dark, 4);
    line(g, X + side * 10, 50, X + side * 16, 64, STEEL.base, 2);
    ellipse(g, X + side * 16, 66, 3, 3, metal(g, BRASS, X + side * 16 - 3, X + side * 16 + 3));
  }
  ellipse(g, X, 42, 7, 3, BRASS.dark);
  lens(g, X, 31, 8);
  for (let i = 0; i < 4; i++) {
    const y = 21 - i * 2.4;
    ellipse(g, X, y, 4.4 - i * 0.4, 1.5, metal(g, COPPER, X - 4, X + 4));
  }
  line(g, X, 13, X, 9, BRASS.dark, 2);
  ellipse(g, X, 8, 2.6, 2.6, metal(g, BRASS, X - 3, X + 3));
  spark(g, X, 8, X - 9, 5, 1);
  spark(g, X, 8, X + 8, 11, 2);
  spark(g, X, 8, X + 5, 3, 3);
};

const rook = (g: G, f: Faction): void => {
  plate(g, f);
  for (const side of [-1, 1]) {
    const px = X + side * 18;
    rect(g, px - 2.5, 50, 5, 16, metal(g, BRASS, px - 3, px + 3), 1.5);
    line(g, px, 66, px, 80, STEEL.base, 2.2);
    line(g, px, 50, px, 44, STEEL.base, 2);
    ellipse(g, px, 81, 3, 2, COPPER.dark);
    line(g, px, 44, X + side * 12, 40, COPPER.base, 2);
  }
  poly(g, [X - 14, 82, X - 14, 36, X + 14, 36, X + 14, 82], metal(g, COPPER, X - 14, X + 14));
  for (const y of [40, 56, 72]) {
    rect(g, X - 14.5, y - 1.8, 29, 3.6, metal(g, BRASS, X - 14, X + 14), 1);
    rivets(g, [X - 10, y, X, y, X + 10, y], 0.9);
  }
  const rim = [X - 15, 37];
  for (let i = 0; i < 4; i++) {
    const x = X - 15 + i * 7.5;
    rim.push(x, 30, x + 4.5, 30, x + 4.5, 37);
    if (i < 3) rim.push(x + 7.5, 37);
  }
  rim.push(X + 15, 37);
  poly(g, rim, metal(g, BRASS, X - 15, X + 15));
  rect(g, X - 8, 60, 16, 11, enamel(g, f, X - 8, X + 8), 2);
  gloss(g, X - 5, 62, 69);
  gauge(g, X, 48, 5.5, -Math.PI * 0.2);
  rect(g, X - 5, 74, 10, 7, "#0b0806", 1);
  ellipse(g, X, 78, 4, 3, radial(g, X, 78, 4, [[0, "#ffb24a"], [0.5, alpha("#ff7a1a", 0.6)], [1, alpha("#ff7a1a", 0)]]));
  rect(g, X - 4, 14, 8, 23, metal(g, STEEL, X - 4, X + 4), 1);
  poly(g, [X - 6, 16, X + 6, 16, X + 5, 11, X - 5, 11], metal(g, BRASS, X - 6, X + 6));
  puff(g, X + 3, 8, 3);
  puff(g, X - 3, 6, 2.6, 0.6);
};

const queen = (g: G, f: Faction): void => {
  plate(g, f);
  poly(g, [X - 15, 82, X - 6, 46, X + 6, 46, X + 15, 82], enamel(g, f, X - 15, X + 15));
  for (const dx of [-7, 0, 7]) line(g, X + dx * 0.4, 48, X + dx * 1.9, 81, BRASS.base, 1.3);
  gloss(g, X - 7, 50, 78);
  poly(g, [X - 14.5, 82, X + 14.5, 82, X + 15, 79, X - 15, 79], metal(g, BRASS, X - 15, X + 15));
  rect(g, X - 7, 50, 14, 3.5, metal(g, COPPER, X - 7, X + 7), 1);
  poly(g, [X - 6, 50, X - 5, 36, X + 5, 36, X + 6, 50], metal(g, BRASS, X - 6, X + 6));
  rect(g, X - 3, 39, 6, 8, enamel(g, f, X - 3, X + 3), 1);
  for (const side of [-1, 1]) {
    gear(g, X + side * 7, 38, 3.2, 3.2, 7, COPPER);
    line(g, X + side * 8, 40, X + side * 12, 52, STEEL.base, 2);
    ellipse(g, X + side * 12, 53, 2.4, 2.4, metal(g, BRASS, X + side * 12 - 2, X + side * 12 + 2));
  }
  line(g, X, 36, X, 26, BRASS.dark, 2.4);
  const ring = (rx: number, ry: number, rot: number, color: string): void => {
    g.beginPath();
    g.ellipse(X, 22, rx, ry, rot, 0, Math.PI * 2);
    g.strokeStyle = color;
    g.lineWidth = 1.4;
    g.stroke();
  };
  ring(13, 4.2, -0.35, BRASS.base);
  ring(9.5, 9.5, 0, COPPER.base);
  ring(11, 3.2, 0.7, BRASS.light);
  ellipse(g, X, 22, 7, 7, radial(g, X, 22, 7, [[0, alpha("#ffd86a", 0.55)], [1, alpha("#ffd86a", 0)]]));
  ellipse(g, X, 22, 3.6, 3.6, radial(g, X - 1.2, 20.8, 4, [[0, "#fff6d0"], [0.5, BRASS.base], [1, BRASS.dark]]));
  ellipse(g, X - 12.2, 24.6, 1.6, 1.6, f.base);
  ellipse(g, X + 9.5, 22, 1.4, 1.4, COPPER.light);
  ellipse(g, X + 7.5, 13.5, 1.3, 1.3, "#d8e6f2");
};

const king = (g: G, f: Faction): void => {
  plate(g, f);
  poly(g, [X - 13, 48, X + 13, 48, X + 20, 82, X - 20, 82], enamel(g, f, X - 20, X + 20));
  for (const side of [-1, 1]) {
    const sx = X + side * 17;
    rect(g, sx - 3, 48, 6, 14, metal(g, BRASS, sx - 3, sx + 3), 2);
    line(g, sx, 62, sx + side * 2, 76, STEEL.base, 2.6);
    ellipse(g, sx + side * 2, 77, 3.5, 3.5, metal(g, BRASS, sx - 3, sx + 3));
    puff(g, sx + side * 2, 44, 2.6, 0.6);
  }
  poly(g, [X - 16, 82, X - 13, 44, X + 13, 44, X + 16, 82], metal(g, BRASS, X - 16, X + 16));
  for (const side of [-1, 1]) rect(g, X + side * 8.5 - 4, 47, 8, 11, enamel(g, f, X + side * 8.5 - 4, X + side * 8.5 + 4), 1.5);
  gear(g, X, 65, 9, 9, 10, COPPER, f.base);
  rivets(g, [X - 13, 80, X + 13, 80, X - 12, 46, X + 12, 46]);
  rect(g, X - 15, 76, 30, 3.5, metal(g, COPPER, X - 15, X + 15), 1);
  for (let i = -2; i <= 2; i++) {
    const a = -Math.PI / 2 + i * 0.5;
    const bx = X + Math.cos(a) * 11;
    const by = 28 + Math.sin(a) * 11;
    poly(g, [bx - 2.6, by + 1.5, bx + 2.6, by + 1.5, bx + Math.cos(a) * 5.5, by + Math.sin(a) * 5.5], metal(g, BRASS, bx - 2, bx + 2));
    ellipse(g, bx + Math.cos(a) * 5.5, by + Math.sin(a) * 5.5, 1.4, 1.4, f.base);
  }
  gauge(g, X, 28, 10, -Math.PI * 0.6);
  rect(g, X - 8, 29, 16, 15, metal(g, BRASS, X - 8, X + 8), 2);
  visor(g, X - 5.5, X + 5.5, 37, f);
  rivets(g, [X - 6, 41.5, X + 6, 41.5], 0.8);
  rect(g, X - 12, 27, 24, 4, metal(g, BRASS, X - 12, X + 12), 1);
  rivets(g, [X - 9, 29, X + 9, 29], 0.8);
};

export const CLOCKWORK: Record<UnitType, (g: G, f: Faction) => void> = { pawn, knight, bishop, rook, queen, king };
