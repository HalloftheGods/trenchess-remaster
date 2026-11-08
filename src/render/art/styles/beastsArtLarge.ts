import type { Faction } from "../unitArt";
import { ellipse } from "../canvas";
import { BONE, FUR, INK, NOSE, X, blob, cloth, eye, furGrad, groundShadow, poly, stroke, type G } from "./beastsArtHelpers";

const ANTLER_EDGE = "#4a3420";

const antlerPass = (g: G, x0: number, y0: number, dir: 1 | -1, color: string, w: number): void => {
  stroke(g, [x0, y0, x0 + dir * 3, y0 - 9, x0 + dir * 5, y0 - 18, x0 + dir * 4, y0 - 27], color, w);
  stroke(g, [x0 + dir * 3, y0 - 9, x0 + dir * 9, y0 - 14], color, w * 0.8);
  stroke(g, [x0 + dir * 4.5, y0 - 15, x0 + dir * 11, y0 - 21], color, w * 0.8);
  stroke(g, [x0 + dir * 4.8, y0 - 21, x0 + dir * 0.5, y0 - 28], color, w * 0.7);
  stroke(g, [x0 + dir * 4.8, y0 - 21, x0 + dir * 10, y0 - 27], color, w * 0.7);
};

/** Antlers get a dark edge pass under the bone pass so they still read on pale boards. */
const antler = (g: G, x0: number, y0: number, dir: 1 | -1): void => {
  antlerPass(g, x0, y0, dir, ANTLER_EDGE, 4.2);
  antlerPass(g, x0, y0, dir, BONE, 2.4);
};

/** Knight: a stag's head and neck in profile, antlers up, an army caparison over the shoulders. */
export const stag = (g: G, f: Faction): void => {
  const fur = FUR.stag;
  groundShadow(g, 19);
  antler(g, X + 1, 33, -1);
  antler(g, X + 9, 32, 1);
  blob(g, X - 2, 78, 17, 11, furGrad(g, fur, X - 18, 66, X + 14, 90));
  poly(g, [X - 12, 76, X - 7, 44, X + 6, 36, X + 15, 40, X + 13, 74], furGrad(g, fur, X - 10, 40, X + 14, 80));
  poly(g, [X - 7, 48, X - 9, 44, X - 6, 42, X - 1, 48, X - 2, 62, X - 8, 70], fur.dark, null);
  const cap = cloth(g, f, X - 18, X + 16);
  poly(g, [X - 18, 72, X - 14, 60, X + 2, 58, X + 14, 64, X + 16, 80, X + 10, 88, X - 12, 88], cap, f.dark, 1.2);
  g.strokeStyle = f.trim;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(X - 15, 74);
  g.lineTo(X - 12, 64);
  g.lineTo(X + 2, 62);
  g.lineTo(X + 12, 67);
  g.lineTo(X + 13, 80);
  g.stroke();
  ellipse(g, X - 1, 74, 4, 4, f.trim);
  ellipse(g, X - 1, 74, 2, 2, f.light);
  blob(g, X + 5, 36, 11.5, 9.5, furGrad(g, fur, X - 6, 26, X + 16, 46), 0.2);
  poly(g, [X + 12, 31, X + 26, 38, X + 28, 45, X + 19, 48, X + 11, 44], furGrad(g, fur, X + 10, 30, X + 28, 48));
  ellipse(g, X + 19, 45.5, 5.5, 2.6, fur.light);
  ellipse(g, X + 26, 42, 2, 2, NOSE);
  poly(g, [X - 5, 32, X - 12, 20, X - 1, 26], furGrad(g, fur, X - 12, 20, X - 1, 32));
  poly(g, [X - 5, 31, X - 10, 23, X - 2, 27], "#e2b7a0", null);
  eye(g, f, X + 8, 34, 2.5);
  stroke(g, [X + 4, 45, X + 10, 47.5], INK, 0.8);
};

/** Rook: a standing bear, broad and massive, with an army tabard and trim harness. */
export const bear = (g: G, f: Faction): void => {
  const fur = FUR.bear;
  groundShadow(g, 21);
  for (const lx of [X - 10, X + 10]) {
    poly(g, [lx - 7, 62, lx + 7, 62, lx + 8, 86, lx - 8, 86], furGrad(g, fur, lx - 7, 62, lx + 7, 86));
    blob(g, lx, 86, 9, 3.5, fur.dark);
    stroke(g, [lx - 5, 84.5, lx - 5, 88, lx - 1.5, 84, lx - 1.5, 88.5, lx + 2, 84, lx + 2, 88.5, lx + 5.5, 84.5, lx + 5.5, 88], "#120a05", 1.2);
  }
  blob(g, X - 18, 54, 6, 15, furGrad(g, fur, X - 24, 40, X - 12, 70), 0.1);
  blob(g, X + 18, 54, 6, 15, furGrad(g, fur, X + 12, 40, X + 24, 70), -0.1);
  blob(g, X, 50, 19, 25, furGrad(g, fur, X - 19, 26, X + 19, 76));
  ellipse(g, X, 56, 11, 15, fur.light);
  for (const ax of [X - 18, X + 18]) {
    blob(g, ax, 69, 5.5, 4, fur.dark);
    stroke(g, [ax - 3.5, 70, ax - 3.5, 73.5, ax, 70, ax, 74, ax + 3.5, 70, ax + 3.5, 73.5], "#120a05", 1.2);
  }
  const tab = cloth(g, f, X - 11, X + 11);
  poly(g, [X - 11, 40, X + 11, 40, X + 9, 74, X - 9, 74], tab, f.dark, 1.2);
  g.fillStyle = f.trim;
  g.fillRect(X - 11, 40, 22, 2.4);
  g.fillRect(X - 9.2, 71.5, 18.4, 2.4);
  poly(g, [X, 48, X + 6, 56, X, 66, X - 6, 56], f.trim, f.dark, 1);
  poly(g, [X, 51, X + 3.5, 56, X, 62, X - 3.5, 56], f.light, null);
  for (const sx of [-1, 1]) {
    poly(g, [X + sx * 10, 40, X + sx * 19, 44, X + sx * 20, 48, X + sx * 10, 44], f.dark, INK, 1);
  }
  blob(g, X - 10, 16, 4.8, 4.8, furGrad(g, fur, X - 14, 12, X - 6, 20));
  blob(g, X + 10, 16, 4.8, 4.8, furGrad(g, fur, X + 6, 12, X + 14, 20));
  ellipse(g, X - 10, 16.5, 2.4, 2.4, fur.light);
  ellipse(g, X + 10, 16.5, 2.4, 2.4, fur.light);
  blob(g, X, 24, 12.5, 11, furGrad(g, fur, X - 12, 14, X + 12, 36));
  ellipse(g, X, 29, 6.5, 5, fur.light);
  blob(g, X, 27, 3.2, 2.4, NOSE, 0, null);
  stroke(g, [X, 29, X, 32], INK, 1);
  eye(g, f, X - 5, 22, 1.8);
  eye(g, f, X + 5, 22, 1.8);
};
