import type { UnitType } from "../../../engine/types";
import type { Faction } from "../unitArt";
import { ellipse, radial } from "../canvas";
import { BONE, IRON, INK, RUST, SOUL, X, alpha, bone, eye, flame, grad, ground, line, lit, poly, ribs, skull, tatter, type G } from "./undeadParts";

const rustBlade = (g: G, x0: number, y0: number, x1: number, y1: number, w: number): void => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * w;
  const ny = (dx / len) * w;
  const gr = g.createLinearGradient(x0 - nx, y0 - ny, x0 + nx, y0 + ny);
  gr.addColorStop(0, "#b9aa96");
  gr.addColorStop(0.5, "#6f5c4c");
  gr.addColorStop(1, RUST);
  poly(g, [x0 - nx, y0 - ny, x1 - nx * 0.2 + dx * 0.04, y1 - ny * 0.2 + dy * 0.04, x1, y1, x0 + nx, y0 + ny], gr, INK, 1);
  line(g, x0 - nx * 2, y0 - ny * 2, x0 + nx * 2, y0 + ny * 2, IRON.dark, 2.4);
};

const pawn = (g: G, f: Faction): void => {
  ground(g, f);
  bone(g, X - 5, 68, X - 7, 84, 2.4);
  bone(g, X + 4, 68, X + 6, 84, 2.4);
  ellipse(g, X, 67, 7, 3.5, BONE.base);
  tatter(g, X - 8, 63, X + 8, 63, X - 8, X + 8, 76, lit(g, f, X - 8, X + 8));
  ribs(g, X, 48, 7, 4);
  bone(g, X - 7, 47, X - 14, 60, 2);
  bone(g, X - 14, 60, X - 9, 68, 2);
  bone(g, X + 7, 47, X + 15, 58, 2);
  rustBlade(g, X + 15, 56, X + 20, 18, 3.4);
  line(g, X + 14, 64, X + 16, 56, IRON.dark, 2.4);
  ellipse(g, X + 15, 58, 2.6, 2.6, BONE.light);
  poly(g, [X - 8, 46, X + 8, 46, X + 10, 50, X - 10, 50], alpha(f.base, 0.9), INK, 0.8);
  skull(g, X, 38, 7, f);
};

const knight = (g: G, f: Faction): void => {
  ground(g, f);
  for (const [x0, x1] of [[X - 14, X - 16], [X - 8, X - 7], [X + 8, X + 9], [X + 14, X + 17]]) {
    bone(g, x0, 70, x1, 85, 2.4);
    ellipse(g, x1, 86, 2.6, 1.4, IRON.dark);
  }
  tatter(g, X - 15, 60, X + 11, 60, X - 15, X + 11, 76, lit(g, f, X - 15, X + 11), 3);
  bone(g, X - 18, 62, X + 12, 60, 3);
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(X - 11 + i * 5.5, 62, 6, 0.1, Math.PI - 0.1);
    g.strokeStyle = INK;
    g.lineWidth = 2.4;
    g.stroke();
    g.strokeStyle = BONE.light;
    g.lineWidth = 1.2;
    g.stroke();
  }
  bone(g, X + 11, 60, X + 21, 44, 3.4);
  poly(g, [X + 17, 40, X + 24, 36, X + 31, 45, X + 30, 51, X + 23, 51, X + 18, 46], grad(g, BONE, X + 17, X + 31));
  poly(g, [X + 19, 38, X + 21, 31, X + 23, 38], BONE.base);
  poly(g, [X + 23, 37, X + 26, 31, X + 27, 38], BONE.dark);
  ellipse(g, X + 23, 43, 1.8, 2, "#120c08");
  eye(g, X + 23, 43, 1, f);
  for (let i = 0; i < 3; i++) line(g, X + 25 + i * 1.8, 50, X + 25 + i * 1.8, 47, INK, 0.8);
  poly(g, [X - 4, 44, X - 20, 70, X - 9, 62, X - 2, 58], grad(g, { light: f.base, base: f.dark, dark: f.dark }, X - 20, X - 2));
  bone(g, X - 2, 58, X - 1, 44, 2);
  ribs(g, X - 1, 45, 5, 3);
  bone(g, X + 3, 46, X + 11, 54, 1.8);
  line(g, X - 12, 68, X + 29, 14, IRON.dark, 2.6);
  line(g, X - 12, 68, X + 29, 14, IRON.light, 1);
  rustBlade(g, X + 26, 18, X + 30, 10, 1.8);
  poly(g, [X + 20, 24, X + 28, 30, X + 18, 34], lit(g, f, X + 18, X + 28));
  skull(g, X - 1, 36, 6, f);
  poly(g, [X - 8, 34, X - 6, 27, X - 1, 25, X + 4, 27, X + 6, 34], grad(g, IRON, X - 8, X + 6));
};

const bishop = (g: G, f: Faction): void => {
  ground(g, f);
  line(g, X + 15, 86, X + 15, 20, IRON.dark, 3);
  line(g, X + 14, 86, X + 14, 20, IRON.light, 1);
  tatter(g, X - 9, 46, X + 9, 46, X - 17, X + 17, 86, lit(g, f, X - 17, X + 17), 5);
  poly(g, [X + 4, 46, X + 9, 46, X + 17, 86, X + 10, 86], alpha("#000000", 0.22), INK, 0);
  line(g, X - 3, 50, X - 4, 84, f.trim, 2.2);
  line(g, X + 3, 50, X + 4, 84, f.trim, 2.2);
  for (const y of [58, 68, 78]) line(g, X - 5, y, X - 2, y, INK, 0.8);
  bone(g, X + 8, 52, X + 13, 58, 1.8);
  ellipse(g, X + 14, 58, 3, 2.6, BONE.base);
  bone(g, X - 8, 54, X - 13, 64, 1.8);
  ellipse(g, X - 13, 65, 3, 2.6, BONE.base);
  poly(g, [X - 11, 50, X - 10, 34, X, 22, X + 10, 34, X + 11, 50], grad(g, { light: f.base, base: f.dark, dark: f.dark }, X - 11, X + 11));
  ellipse(g, X, 41, 5.5, 7, "#0d0906");
  poly(g, [X - 4, 45, X + 4, 45, X + 3, 48, X - 3, 48], BONE.base, INK, 0.8);
  eye(g, X - 2.4, 40, 1.1, f);
  eye(g, X + 2.4, 40, 1.1, f);
  skull(g, X + 15, 19, 3.2, f);
  flame(g, X + 15, 11, 6);
};

const rook = (g: G, f: Faction): void => {
  ground(g, f);
  for (const wx of [X - 14, X + 14]) {
    ellipse(g, wx, 83, 6.5, 6.5, IRON.dark);
    ellipse(g, wx, 83, 5, 5, grad(g, IRON, wx - 5, wx + 5));
    for (let a = 0; a < 3; a++) line(g, wx - Math.cos(a) * 4, 83 - Math.sin(a) * 4, wx + Math.cos(a) * 4, 83 + Math.sin(a) * 4, BONE.base, 1.2);
  }
  poly(g, [X - 13, 80, X - 11, 30, X + 11, 30, X + 13, 80], grad(g, IRON, X - 13, X + 13));
  for (const y of [36, 50, 64, 76]) {
    line(g, X - 12, y, X + 12, y, RUST, 2.2);
    for (const rx of [X - 9, X, X + 9]) ellipse(g, rx, y, 1, 1, BONE.light);
  }
  tatter(g, X - 11, 51, X + 11, 51, X - 11, X + 11, 62, lit(g, f, X - 11, X + 11), 3);
  bone(g, X - 9, 77, X + 9, 65, 1.8);
  bone(g, X + 9, 77, X - 9, 65, 1.8);
  g.fillStyle = "#0c0806";
  g.fillRect(X - 3.5, 70, 7, 10);
  ellipse(g, X, 76, 2.5, 3, radial(g, X, 76, 3, [[0, alpha(SOUL.mid, 0.8)], [1, alpha(SOUL.mid, 0)]]));
  skull(g, X, 42, 6, f);
  const teeth = [X - 13, 30];
  for (let i = 0; i < 6; i++) {
    const x = X - 13 + i * 5.2;
    teeth.push(x + 2.6, i % 2 === 0 ? 20 : 24, x + 5.2, 30);
  }
  poly(g, teeth, grad(g, BONE, X - 13, X + 13));
  line(g, X, 24, X, 6, IRON.dark, 1.8);
  tatter(g, X, 6, X + 15, 10, X + 1, X + 15, 15, lit(g, f, X, X + 15), 2);
};

const queen = (g: G, f: Faction): void => {
  ground(g, f);
  for (const [dx, dy, r] of [[-12, 82, 7], [-2, 85, 9], [10, 83, 7], [17, 86, 5]]) ellipse(g, X + dx, dy, r, r * 0.45, alpha(f.light, 0.3));
  const gown = g.createLinearGradient(0, 46, 0, 86);
  gown.addColorStop(0, f.base);
  gown.addColorStop(0.55, f.dark);
  gown.addColorStop(1, alpha(f.dark, 0));
  poly(g, [X - 8, 46, X + 8, 46, X + 15, 86, X + 6, 78, X - 2, 86, X - 10, 78, X - 16, 86], gown, INK, 0);
  poly(g, [X - 8, 46, X - 1, 46, X - 4, 80, X - 16, 86], alpha(f.light, 0.18), INK, 0);
  poly(g, [X - 3, 24, X + 8, 22, X + 24, 32, X + 29, 50, X + 22, 44, X + 14, 40, X + 8, 46, X + 4, 36], alpha(f.light, 0.5), alpha("#ffffff", 0.5), 1);
  poly(g, [X + 10, 36, X + 26, 56, X + 29, 72, X + 20, 60, X + 12, 48], alpha(f.light, 0.3), INK, 0);
  bone(g, X - 7, 48, X - 17, 38, 1.8);
  bone(g, X - 17, 38, X - 16, 28, 1.8);
  for (let i = -1; i <= 1; i++) line(g, X - 16, 28, X - 17 + i * 2.5, 22, BONE.light, 1.2);
  bone(g, X + 7, 48, X + 15, 40, 1.8);
  for (let i = -1; i <= 1; i++) line(g, X + 15, 40, X + 19 + i * 2, 36 + i, BONE.light, 1.2);
  for (const [sx, ex, ey] of [[-5, -14, 54], [-3, -10, 58], [6, 12, 56]]) {
    g.beginPath();
    g.moveTo(X + sx, 30);
    g.quadraticCurveTo(X + sx * 2.2, 44, X + ex, ey);
    g.strokeStyle = BONE.light;
    g.lineWidth = 1.6;
    g.stroke();
  }
  skull(g, X, 36, 6.5, f, 3);
  poly(g, [X - 6, 30, X - 7, 20, X - 3, 25, X, 16, X + 3, 25, X + 7, 20, X + 6, 30], f.trim, "#5a4310", 1);
  ellipse(g, X, 24, 1.6, 1.6, SOUL.mid);
};

const king = (g: G, f: Faction): void => {
  ground(g, f);
  poly(g, [X - 18, 84, X - 18, 40, X - 12, 30, X, 26, X + 12, 30, X + 18, 40, X + 18, 84], grad(g, IRON, X - 18, X + 18));
  for (const [sx, sy, sr] of [[-14, 46, 3], [-8, 40, 3.2], [8, 40, 3.2], [14, 46, 3], [-15, 54, 2.6], [15, 54, 2.6]]) skull(g, X + sx, sy, sr, f);
  for (const [sx, sy] of [[-13, 36], [-4.5, 31], [4.5, 31], [13, 36]]) skull(g, X + sx, sy, 3.6, f);
  for (const side of [-1, 1]) {
    ellipse(g, X + side * 16, 64, 4, 3, IRON.light);
    skull(g, X + side * 16, 59, 3, f);
  }
  poly(g, [X - 12, 50, X + 12, 50, X + 17, 84, X - 17, 84], grad(g, { light: f.dark, base: f.dark, dark: "#000000" }, X - 17, X + 17));
  tatter(g, X - 10, 50, X + 10, 50, X - 14, X + 14, 85, lit(g, f, X - 14, X + 14), 3);
  line(g, X - 7, 52, X - 11, 84, f.trim, 1.6);
  line(g, X + 7, 52, X + 11, 84, f.trim, 1.6);
  ribs(g, X, 53, 5.5, 3);
  bone(g, X + 9, 54, X + 14, 63, 1.8);
  ellipse(g, X + 15, 64, 3, 2.6, BONE.base);
  bone(g, X - 9, 54, X - 14, 60, 1.8);
  line(g, X + 15, 86, X + 15, 16, IRON.dark, 2.6);
  line(g, X + 14.5, 86, X + 14.5, 16, IRON.light, 0.8);
  ellipse(g, X + 15, 13, 5.5, 5.5, radial(g, X + 15, 13, 5.5, [[0, alpha(SOUL.mid, 0.6)], [1, alpha(SOUL.mid, 0)]]));
  ellipse(g, X + 15, 13, 3.2, 3.2, radial(g, X + 14, 12, 3.4, [[0, SOUL.core], [0.5, SOUL.mid], [1, SOUL.deep]]));
  skull(g, X, 41, 7, f);
  poly(g, [X - 8, 37, X - 8, 26, X - 4, 31, X, 22, X + 4, 31, X + 8, 26, X + 8, 37], f.trim, "#5a4310", 1);
  ellipse(g, X, 31, 2.2, 2.6, SOUL.mid);
  ellipse(g, X - 0.6, 30.4, 0.8, 0.8, SOUL.core);
};

export const UNDEAD: Record<UnitType, (g: G, f: Faction) => void> = { pawn, knight, bishop, rook, queen, king };
