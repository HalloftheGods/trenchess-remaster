import type { Faction } from "../unitArt";
import { ellipse } from "../canvas";
import { FUR, HEAD_R, HEAD_Y, INK, TAU, X, dotEye, face, poly, stroke, vinyl, type G } from "./beastsArtHelpers";
import { figure, head, muzzle } from "./beastsArtBody";

const NOSE_PINK = "#e58aa0";
const BEAK = { light: "#ffd9a0", base: "#f0a84a", dark: "#b8702a" };

/** Tiny "w" smile under a muzzle nose. */
const muzzleSmile = (g: G, y: number): void => {
  stroke(g, [X - 3, y, X - 1.5, y + 1.6, X, y, X + 1.5, y + 1.6, X + 3, y], INK, 0.9);
};

/** Pawn: a chibi hare, tall ears up, army scarf. */
export const hare = (g: G, f: Faction): void => {
  const fur = FUR.hare;
  figure(g, f, fur, { rx: 11.5, ry: 15 });
  for (const sx of [-1, 1]) {
    const ex = X + sx * 6.5;
    vinyl(g, ex, 16.5, 4.4, 10, fur, -sx * 0.18);
    g.save();
    g.translate(ex, 17.5);
    g.rotate(-sx * 0.18);
    g.beginPath();
    g.ellipse(0, 0, 2.3, 7, 0, 0, TAU);
    g.fillStyle = FUR.pink.base;
    g.fill();
    g.restore();
  }
  head(g, fur);
  muzzle(g, 40, 6, 3.8, fur, NOSE_PINK);
  muzzleSmile(g, 41.2);
  face(g, X, HEAD_Y, HEAD_R, -1, false);
  stroke(g, [X - 7, 40, X - 13, 39], INK, 0.6);
  stroke(g, [X - 7, 41.5, X - 13, 42.5], INK, 0.6);
  stroke(g, [X + 7, 40, X + 13, 39], INK, 0.6);
  stroke(g, [X + 7, 41.5, X + 13, 42.5], INK, 0.6);
};

/** Feather scallops on the owl's chest. */
const chestFeathers = (g: G, y0: number, y1: number): void => {
  g.strokeStyle = "rgba(90,70,50,0.35)";
  g.lineWidth = 0.9;
  for (let y = y0; y < y1; y += 4.5) {
    const off = Math.round((y - y0) / 4.5) % 2 === 0 ? 0 : 2.5;
    for (let x = -5 + off; x <= 5; x += 5) {
      g.beginPath();
      g.arc(X + x, y, 2.2, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
    }
  }
};

/** Round gold spectacles over the owl's eyes. */
const spectacles = (g: G, f: Faction, y: number): void => {
  g.lineWidth = 1.8;
  g.strokeStyle = f.trim;
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.arc(X + sx * 5.8, y, 5.4, 0, TAU);
    g.stroke();
  }
  stroke(g, [X - 0.6, y - 0.5, X + 0.6, y - 0.5], f.trim, 1.8);
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.arc(X + sx * 5.8, y, 5.4, Math.PI * 1.1, Math.PI * 1.45);
    g.strokeStyle = "rgba(255,255,255,0.75)";
    g.lineWidth = 1.2;
    g.stroke();
  }
};

/** Bishop: a chibi owl with ear tufts, round spectacles, wing arms and a scarf stole. */
export const owl = (g: G, f: Faction): void => {
  const fur = FUR.owl;
  figure(g, f, fur, { rx: 12.5, ry: 16, belly: fur.light, noLeftArm: true, noRightArm: true, feet: BEAK });
  chestFeathers(g, 58, 78);
  vinyl(g, X - 15, 62, 4.6, 11, fur, 0.22);
  vinyl(g, X + 15, 62, 4.6, 11, fur, -0.22);
  poly(g, [X - 12, 22, X - 14.5, 9, X - 5, 18.5], fur.base, fur.dark, 1);
  poly(g, [X + 12, 22, X + 14.5, 9, X + 5, 18.5], fur.base, fur.dark, 1);
  head(g, fur);
  ellipse(g, X - 5.8, 33, 6.8, 6.8, fur.light);
  ellipse(g, X + 5.8, 33, 6.8, 6.8, fur.light);
  dotEye(g, X - 5.8, 33, 2.7);
  dotEye(g, X + 5.8, 33, 2.7);
  spectacles(g, f, 33);
  poly(g, [X - 2.6, 38.5, X + 2.6, 38.5, X, 43.5], BEAK.base, BEAK.dark, 0.8);
  ellipse(g, X - 0.8, 39.6, 0.9, 0.6, BEAK.light);
  ellipse(g, X - 10.5, 38.5, 2.4, 1.6, "rgba(240,130,145,0.45)");
  ellipse(g, X + 10.5, 38.5, 2.4, 1.6, "rgba(240,130,145,0.45)");
};
