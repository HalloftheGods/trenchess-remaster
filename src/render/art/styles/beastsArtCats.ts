import type { Faction } from "../unitArt";
import { ellipse } from "../canvas";
import { FUR, INK, NOSE, X, blob, cloth, collar, eye, furGrad, groundShadow, poly, stroke, type Fur, type G } from "./beastsArtHelpers";

/** Shared seated big-cat body: haunches, tail, torso, forelegs. Returns nothing; head is drawn by the caller. */
const catBody = (g: G, fur: Fur, headY: number): void => {
  stroke(g, [X + 12, 82, X + 24, 78, X + 27, 68, X + 22, 62], fur.dark, 3.2);
  ellipse(g, X + 22, 61, 3, 3.5, FUR.mane.dark);
  blob(g, X, 79, 17, 9.5, furGrad(g, fur, X - 17, 70, X + 17, 88));
  poly(g, [X - 14, 80, X - 11, headY + 12, X + 11, headY + 12, X + 14, 80], furGrad(g, fur, X - 14, headY, X + 14, 84));
  ellipse(g, X, headY + 34, 8, 15, fur.light);
  for (const lx of [X - 6.5, X + 6.5]) {
    poly(g, [lx - 3.2, 64, lx + 3.2, 64, lx + 3.6, 86, lx - 3.6, 86], furGrad(g, fur, lx - 3, 64, lx + 3, 86));
    blob(g, lx, 86, 4.8, 2.8, fur.light);
    stroke(g, [lx - 2.5, 85.5, lx - 2.5, 88, lx, 85, lx, 88.5, lx + 2.5, 85.5, lx + 2.5, 88], INK, 0.8);
  }
};

const catHead = (g: G, f: Faction, fur: Fur, y: number, r: number): void => {
  for (const sx of [-1, 1]) {
    blob(g, X + sx * (r - 1), y - r + 1, 3.6, 3.6, furGrad(g, fur, X + sx * r - 4, y - r - 3, X + sx * r + 4, y - r + 4));
    ellipse(g, X + sx * (r - 1), y - r + 1.6, 1.8, 1.8, "#d9a08a");
  }
  blob(g, X, y, r, r - 0.5, furGrad(g, fur, X - r, y - r, X + r, y + r));
  ellipse(g, X, y + 3.5, 5.5, 3.8, fur.light);
  poly(g, [X - 2, y + 2, X + 2, y + 2, X, y + 4.2], NOSE, null);
  stroke(g, [X, y + 4, X, y + 5.5, X - 2.5, y + 7], INK, 0.8);
  stroke(g, [X, y + 5.5, X + 2.5, y + 7], INK, 0.8);
  eye(g, f, X - 4, y - 1.5, 1.9);
  eye(g, f, X + 4, y - 1.5, 1.9);
};

/** A spiky star polygon for the mane: alternating outer/inner radii, slightly taller than wide. */
const manePoints = (cy: number, outer: number, inner: number, spikes = 14): number[] => {
  const pts: number[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? outer : inner;
    pts.push(X + Math.cos(a) * rr, cy + Math.sin(a) * rr * 1.08);
  }
  return pts;
};

/** Queen: a lioness seated tall, army collar with a jewel and a slender trim diadem. */
export const lioness = (g: G, f: Faction): void => {
  const fur = FUR.lion;
  groundShadow(g, 19);
  catBody(g, fur, 26);
  catHead(g, f, fur, 26, 10.5);
  collar(g, f, X, 41, 10.5, 3.4);
  g.strokeStyle = f.trim;
  g.lineWidth = 2.6;
  g.beginPath();
  g.ellipse(X, 19, 9, 3.4, 0, Math.PI * 1.05, Math.PI * 1.95);
  g.stroke();
  poly(g, [X - 3, 16.2, X, 10, X + 3, 16.2], f.trim, "#7a5a10", 0.8);
  poly(g, [X - 8.5, 17.5, X - 7, 13, X - 5, 16.6], f.trim, "#7a5a10", 0.8);
  poly(g, [X + 8.5, 17.5, X + 7, 13, X + 5, 16.6], f.trim, "#7a5a10", 0.8);
  ellipse(g, X, 15, 1.6, 1.6, f.base);
};

/** King: the maned lion, army cape over the back, trim crown. */
export const lion = (g: G, f: Faction): void => {
  const fur = FUR.lion;
  const mane = FUR.mane;
  groundShadow(g, 20);
  const cape = cloth(g, f, X - 20, X + 20);
  poly(g, [X - 14, 40, X + 14, 40, X + 21, 86, X - 21, 86], cape, f.dark, 1.2);
  g.strokeStyle = f.trim;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(X - 14, 42);
  g.lineTo(X - 20, 85);
  g.moveTo(X + 14, 42);
  g.lineTo(X + 20, 85);
  g.stroke();
  catBody(g, fur, 30);
  poly(g, manePoints(31, 18, 14.5), furGrad(g, mane, X - 18, 12, X + 18, 50));
  catHead(g, f, fur, 30, 9.5);
  poly(g, [X - 9, 22, X - 9, 12, X - 4.5, 17, X, 10, X + 4.5, 17, X + 9, 12, X + 9, 22], f.trim, "#7a5a10", 1);
  g.fillStyle = f.base;
  for (const dx of [-5, 0, 5]) ellipse(g, X + dx, 19.5, 1.3, 1.3, dx === 0 ? f.light : f.base);
  ellipse(g, X, 44, 3, 3.4, f.trim);
  ellipse(g, X - 0.8, 43.2, 1, 1, "#fff6d0");
};
