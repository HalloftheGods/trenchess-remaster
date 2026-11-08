import type { Faction } from "../unitArt";
import { ellipse } from "../canvas";
import { FUR, HEAD_R, HEAD_Y, INK, X, face, stroke, vinyl, type G } from "./beastsArtHelpers";
import { figure, head, muzzle, roundEar } from "./beastsArtBody";

const NOSE_DARK = "#3a2820";

/** Stubby toy antler: a dark edge pass under a bone pass, round caps. */
const antler = (g: G, x: number, dir: 1 | -1): void => {
  const passes: [string, number][] = [
    [FUR.bone.dark, 4.6],
    [FUR.bone.base, 2.8],
  ];
  for (const [color, w] of passes) {
    stroke(g, [x, 21, x + dir * 2.5, 13, x + dir * 4.5, 7.5], color, w);
    stroke(g, [x + dir * 1.2, 16.5, x + dir * 7, 11.5], color, w * 0.85);
  }
  ellipse(g, x + dir * 4.3, 7.8, 1.2, 1.2, FUR.bone.light);
  ellipse(g, x + dir * 6.8, 11.8, 1, 1, FUR.bone.light);
};

/** Knight: a chibi stag with little antlers, long snout and an army saddle blanket. */
export const stag = (g: G, f: Faction): void => {
  const fur = FUR.stag;
  figure(g, f, fur, { rx: 12.5, ry: 16 });
  g.save();
  g.beginPath();
  g.ellipse(X, 64, 12.5, 16, 0, 0, Math.PI * 2);
  g.clip();
  ellipse(g, X, 56, 14, 4.5, f.base);
  g.fillStyle = f.base;
  g.fillRect(X - 14, 56, 28, 8);
  ellipse(g, X, 64, 14, 4.5, f.dark);
  g.strokeStyle = f.trim;
  g.lineWidth = 1.2;
  g.beginPath();
  g.ellipse(X, 56, 14, 4.5, 0, 0, Math.PI);
  g.stroke();
  g.restore();
  antler(g, X - 7.5, -1);
  antler(g, X + 7.5, 1);
  roundEar(g, X - 13.5, 24, 4.2, fur, FUR.pink.base);
  roundEar(g, X + 13.5, 24, 4.2, fur, FUR.pink.base);
  head(g, fur);
  muzzle(g, 40.5, 7.5, 5, fur, NOSE_DARK);
  face(g, X, HEAD_Y, HEAD_R, -1.5, false);
  stroke(g, [X - 2.5, 43, X, 44.5, X + 2.5, 43], INK, 0.9);
};

/** A small tower shield in the army colours with a trim boss, held at the bear's right. */
const towerShield = (g: G, f: Faction): void => {
  const x0 = X + 12;
  const y0 = 48;
  const w = 13;
  const h = 30;
  g.beginPath();
  g.roundRect(x0, y0, w, h, [5, 5, 7, 7]);
  const grad = g.createLinearGradient(x0, y0, x0 + w, y0 + h);
  grad.addColorStop(0, f.light);
  grad.addColorStop(0.4, f.base);
  grad.addColorStop(1, f.dark);
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = f.dark;
  g.lineWidth = 1.4;
  g.stroke();
  g.beginPath();
  g.roundRect(x0 + 2.2, y0 + 2.2, w - 4.4, h - 4.4, [3.5, 3.5, 5, 5]);
  g.strokeStyle = f.trim;
  g.lineWidth = 1.2;
  g.stroke();
  vinyl(g, x0 + w / 2, y0 + h / 2, 3.2, 3.2, FUR.gold);
  g.beginPath();
  g.ellipse(x0 + 4, y0 + 7, 1.6, 4, -0.4, 0, Math.PI * 2);
  g.fillStyle = "rgba(255,255,255,0.4)";
  g.fill();
};

/** Rook: a stocky chibi bear holding a tiny tower shield. */
export const bear = (g: G, f: Faction): void => {
  const fur = FUR.bear;
  figure(g, f, fur, { rx: 14.5, ry: 17, noRightArm: true });
  towerShield(g, f);
  vinyl(g, X + 14, 66, 4.6, 4.2, fur, -0.3);
  roundEar(g, X - 11, 20, 4.8, fur, fur.light);
  roundEar(g, X + 11, 20, 4.8, fur, fur.light);
  head(g, fur);
  muzzle(g, 40, 7, 4.8, fur, NOSE_DARK);
  face(g, X, HEAD_Y, HEAD_R, -1.5, false);
  stroke(g, [X - 2.5, 42.5, X, 44, X + 2.5, 42.5], INK, 0.9);
};
