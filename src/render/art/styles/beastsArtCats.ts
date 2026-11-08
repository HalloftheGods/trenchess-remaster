import type { Faction } from "../unitArt";
import { ellipse } from "../canvas";
import { FUR, HEAD_R, HEAD_Y, INK, TAU, X, face, poly, stroke, vinyl, type G } from "./beastsArtHelpers";
import { figure, head, muzzle, roundEar } from "./beastsArtBody";

const NOSE_CAT = "#c97a86";
const GOLD_EDGE = "#8a6418";

/** Cat head: round ears, head, little muzzle with a cat nose and whisker dots. */
const catHead = (g: G): void => {
  const fur = FUR.lion;
  roundEar(g, X - 11.5, 20.5, 4.6, fur, FUR.pink.base);
  roundEar(g, X + 11.5, 20.5, 4.6, fur, FUR.pink.base);
  head(g, fur);
  muzzle(g, 40, 6.5, 4.2, fur, NOSE_CAT);
  face(g, X, HEAD_Y, HEAD_R, -1.5, false);
  stroke(g, [X - 2.4, 42.2, X, 43.6, X + 2.4, 42.2], INK, 0.9);
  for (const sx of [-1, 1]) {
    ellipse(g, X + sx * 4.2, 40.2, 0.7, 0.7, "rgba(60,40,30,0.4)");
    ellipse(g, X + sx * 6.4, 41.4, 0.7, 0.7, "rgba(60,40,30,0.4)");
  }
};

/** Golden jewel bead in the army colour. */
const jewel = (g: G, f: Faction, x: number, y: number, r: number): void => {
  vinyl(g, x, y, r, r, { light: f.light, base: f.base, dark: f.dark });
};

/** Lion tail curling out from behind the base, army ribbon tuft. */
const tail = (g: G, f: Faction, dir: 1 | -1): void => {
  const x0 = X + dir * 12;
  stroke(g, [x0, 80, x0 + dir * 9, 78, x0 + dir * 12, 70], FUR.lion.dark, 4.2);
  stroke(g, [x0, 80, x0 + dir * 9, 78, x0 + dir * 12, 70], FUR.lion.base, 2.6);
  vinyl(g, x0 + dir * 12.5, 67, 3.4, 3.8, FUR.mane);
  ellipse(g, x0 + dir * 11.5, 71, 1.6, 1, f.base);
};

/** Queen: a chibi lioness with a gold tiara. */
export const lioness = (g: G, f: Faction): void => {
  const fur = FUR.lion;
  tail(g, f, 1);
  figure(g, f, fur, { rx: 12, ry: 16 });
  catHead(g);
  g.beginPath();
  g.ellipse(X, 20.5, 10.5, 3.6, 0, Math.PI * 1.05, Math.PI * 1.95);
  g.strokeStyle = GOLD_EDGE;
  g.lineWidth = 3.6;
  g.lineCap = "round";
  g.stroke();
  g.beginPath();
  g.ellipse(X, 20.2, 10.5, 3.6, 0, Math.PI * 1.08, Math.PI * 1.92);
  g.strokeStyle = FUR.gold.base;
  g.lineWidth = 2.2;
  g.stroke();
  poly(g, [X - 3, 17.5, X, 10.5, X + 3, 17.5], FUR.gold.base, GOLD_EDGE, 0.8);
  poly(g, [X - 9, 19, X - 7.5, 13.5, X - 5, 17.5], FUR.gold.base, GOLD_EDGE, 0.8);
  poly(g, [X + 9, 19, X + 7.5, 13.5, X + 5, 17.5], FUR.gold.base, GOLD_EDGE, 0.8);
  ellipse(g, X - 0.8, 13.5, 0.8, 1.6, "rgba(255,255,255,0.7)");
  jewel(g, f, X, 17, 2);
};

/** Ring of moulded mane tufts around the head, army-rimmed. */
const mane = (g: G): void => {
  const tufts = 12;
  for (let i = 0; i < tufts; i++) {
    const a = (i / tufts) * TAU - Math.PI / 2;
    const rr = 16.5;
    const x = X + Math.cos(a) * rr;
    const y = HEAD_Y + 1 + Math.sin(a) * rr * 1.05;
    vinyl(g, x, y, 6.2, 6.2, FUR.mane, a);
  }
  vinyl(g, X, HEAD_Y + 1, 17.5, 18, FUR.mane, 0, false);
};

/** Army cape hanging behind the lion, trim edges. */
const cape = (g: G, f: Faction): void => {
  const grad = g.createLinearGradient(X - 21, 0, X + 21, 0);
  grad.addColorStop(0, f.light);
  grad.addColorStop(0.4, f.base);
  grad.addColorStop(1, f.dark);
  poly(g, [X - 12, 43, X + 12, 43, X + 21, 84, X - 21, 84], grad, f.dark, 1.2);
  stroke(g, [X - 12, 45, X - 20, 82], f.trim, 1.2);
  stroke(g, [X + 12, 45, X + 20, 82], f.trim, 1.2);
};

/** King: a chibi lion with a round mane, an army cape and a gold crown. */
export const lion = (g: G, f: Faction): void => {
  const fur = FUR.lion;
  tail(g, f, -1);
  cape(g, f);
  figure(g, f, fur, { rx: 12.5, ry: 16 });
  mane(g);
  catHead(g);
  poly(g, [X - 9, 21, X - 9, 11.5, X - 4.5, 16, X, 9, X + 4.5, 16, X + 9, 11.5, X + 9, 21], FUR.gold.base, GOLD_EDGE, 1);
  g.fillStyle = FUR.gold.light;
  g.fillRect(X - 9, 19, 18, 1.6);
  jewel(g, f, X - 5, 19, 1.4);
  jewel(g, f, X, 18.5, 1.8);
  jewel(g, f, X + 5, 19, 1.4);
  ellipse(g, X - 6.5, 14, 0.8, 1.6, "rgba(255,255,255,0.7)");
};
